---
name: hilt-dependency-injection
description: |
  Configura e implementa Hilt como sistema de inyección de dependencias en la app
  Android de JoyasPOS: módulos para Database (Room + DAOs), Network (Retrofit +
  OkHttp + interceptores), Repository (binding interfaces a implementaciones),
  Print (SunmiPrintHelper) y DataStore. Usar al agregar una nueva dependencia que
  deba inyectarse, al depurar errores de Hilt (Component missing, Unscoped binding),
  o como referencia del scope correcto (@Singleton, @ViewModelScoped) para cada
  tipo de objeto. Consolida todos los módulos Hilt del proyecto en un solo lugar.
  Depende de SKILL-10 (android-project-structure), SKILL-11 (room-database),
  SKILL-14 (retrofit-okhttp-setup) y SKILL-19 (datastore-preferences).
---

# SKILL-17 — Hilt Dependency Injection (apps/mobile)

## Paquete
`com.ltsoft.joyaspos.di`

---

## 1. Configuración inicial

### `JoyasApp.kt` — Application class con Hilt + HiltWorkerFactory

`JoyasApp` debe implementar `Configuration.Provider` e inyectar
`HiltWorkerFactory` para que los `@HiltWorker` (como `SyncWorker`) reciban
sus dependencias correctamente:

```kotlin
@HiltAndroidApp   // ← Sin esto, Hilt no funciona
class JoyasApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        WorkManagerSetup.initialize(this)   // Ver SKILL-13
    }
}
```

En `AndroidManifest.xml`, el inicializador por defecto de WorkManager debe
estar **deshabilitado** para que tome la factory de Hilt:

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        android:value="androidx.startup"
        tools:node="remove" />
</provider>
```

> Si se omite `Configuration.Provider` o el `tools:node="remove"`, el
> `SyncWorker` fallará al arrancar con `InstantiationException` porque
> WorkManager no podrá resolver sus dependencias inyectadas.

### `MainActivity.kt` — entry point de UI
```kotlin
@AndroidEntryPoint  // ← Requerido en toda Activity/Fragment que use Hilt
class MainActivity : ComponentActivity() { ... }
```

### Workers con Hilt
```kotlin
@HiltWorker  // ← En lugar de @AndroidEntryPoint para Workers
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val ventaRepository: VentaRepository,  // inyectado por Hilt
) : CoroutineWorker(context, params)
```

### ViewModels con Hilt
```kotlin
@HiltViewModel  // ← En lugar de @AndroidEntryPoint para ViewModels
class HomeViewModel @Inject constructor(
    private val productoRepository: ProductoRepository,
) : ViewModel()
```

---

## 2. DatabaseModule

```kotlin
// di/DatabaseModule.kt
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): JoyasDatabase =
        Room.databaseBuilder(context, JoyasDatabase::class.java, JoyasDatabase.DATABASE_NAME)
            // Agregar migraciones aquí cuando se incremente la versión:
            // .addMigrations(JoyasDatabase.MIGRATION_1_2)
            .build()

    @Provides
    fun provideVentaDao(db: JoyasDatabase): VentaDao = db.ventaDao()

    @Provides
    fun provideProductoDao(db: JoyasDatabase): ProductoDao = db.productoDao()
}
```

> Los DAOs no llevan `@Singleton` — Room los gestiona internamente.

---

## 3. DataStoreModule

```kotlin
// di/DataStoreModule.kt
@Module
@InstallIn(SingletonComponent::class)
object DataStoreModule {

    @Provides @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(
            produceFile = { context.preferencesDataStoreFile("joyas_session") }
        )

    @Provides @Singleton
    fun provideSessionPreferences(dataStore: DataStore<Preferences>): SessionPreferences =
        SessionPreferences(dataStore)
}
```

---

## 4. NetworkModule (resumen — ver SKILL-14 para código completo)

```kotlin
// di/NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()

    @Provides @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
    }

    @Provides @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        unauthorizedInterceptor: UnauthorizedInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(unauthorizedInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    @Provides @Singleton
    fun provideRetrofit(client: OkHttpClient, moshi: Moshi): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL + "/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

    @Provides @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService = retrofit.create(ApiService::class.java)
}
```

> `AuthInterceptor` y `UnauthorizedInterceptor` se inyectan automáticamente
> porque tienen `@Inject constructor(...)` — no necesitan `@Provides`.

---

## 5. RepositoryModule

```kotlin
// di/RepositoryModule.kt
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    // Hilt hace el binding: cuando alguien pide VentaRepository,
    // entrega VentaRepositoryImpl.
    @Binds @Singleton
    abstract fun bindVentaRepository(impl: VentaRepositoryImpl): VentaRepository

    @Binds @Singleton
    abstract fun bindProductoRepository(impl: ProductoRepositoryImpl): ProductoRepository
}
```

> Usar `abstract class` + `@Binds` (en lugar de `object` + `@Provides`) cuando
> solo se necesita bindear una interfaz a su implementación — es más eficiente.

---

## 6. PrintModule

```kotlin
// di/PrintModule.kt
@Module
@InstallIn(SingletonComponent::class)
object PrintModule {

    @Provides @Singleton
    fun provideSunmiPrintHelper(@ApplicationContext context: Context): SunmiPrintHelper =
        SunmiPrintHelper(context)
}
```

---

## 7. Tabla de scopes

| Scope | Anotación | Tiempo de vida | Usar para |
|---|---|---|---|
| Singleton | `@Singleton` | Toda la app | DB, Retrofit, Repositories, DataStore, PrintHelper |
| ViewModel | `@ViewModelScoped` | Mientras el ViewModel vive | Raramente necesario — los repositories son Singleton |
| Activity | `@ActivityScoped` | Mientras la Activity vive | No usado en este proyecto |
| Sin scope | *(ninguna)* | Nueva instancia cada vez | DAOs (Room los gestiona) |

---

## 8. Errores comunes de Hilt y soluciones

### `[Dagger/MissingBinding]`
**Causa:** Hilt no sabe cómo proveer el tipo solicitado.
**Solución:** Verificar que la clase tenga `@Inject constructor(...)` O que haya un `@Provides`/`@Binds` en algún módulo.

### `Cannot be provided without an @Inject constructor or an @Provides-annotated method`
**Causa:** Se está inyectando una interfaz sin su `@Binds` en `RepositoryModule`.
**Solución:** Agregar el binding en `RepositoryModule`.

### `Unscoped bindings can't be treated as singletons`
**Causa:** Se usa `@Singleton` en un `@Binds` sin que la implementación tenga scope.
**Solución:** Agregar `@Singleton` también en la implementación o en el `@Provides`.

### `HiltWorker must be annotated with @HiltWorker`
**Causa:** El Worker usa `@AndroidEntryPoint` en lugar de `@HiltWorker`.
**Solución:** Reemplazar `@AndroidEntryPoint` con `@HiltWorker` y el constructor con `@AssistedInject`.

### Worker no recibe sus dependencias
**Causa:** Falta `HiltWorkerFactory` en `WorkManager`, o el inicializador
automático sigue activo en el Manifest.
**Solución:** verificar que `JoyasApp` implementa `Configuration.Provider`
(ver sección 1) y que el `<meta-data WorkManagerInitializer>` en el
AndroidManifest tiene `tools:node="remove"`.

---

## 9. Resumen de módulos del proyecto

| Módulo | Tipo | Provee |
|---|---|---|
| `DatabaseModule` | `object` | `JoyasDatabase`, `VentaDao`, `ProductoDao` |
| `DataStoreModule` | `object` | `DataStore<Preferences>`, `SessionPreferences` |
| `NetworkModule` | `object` | `Moshi`, `OkHttpClient`, `Retrofit`, `ApiService` |
| `RepositoryModule` | `abstract class` | `VentaRepository`, `ProductoRepository` |
| `PrintModule` | `object` | `SunmiPrintHelper` |
