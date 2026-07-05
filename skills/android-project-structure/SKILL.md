---
name: android-project-structure
description: |
  Scaffolding completo del proyecto Android de JoyasPOS para Sunmi V2SE:
  Kotlin + Jetpack Compose + Clean Architecture (MVVM) + Hilt + Room + Retrofit
  + WorkManager + Sunmi Printer SDK. Usar al crear el proyecto Android desde cero,
  al agregar una nueva capa (worker, printer, nuevo módulo de dominio), al configurar
  dependencias en build.gradle.kts, o cuando haya dudas sobre dónde ubicar un
  archivo según la arquitectura definida. También usar como referencia de versiones
  de dependencias compatibles con Android API 28+ y Sunmi V2SE.
  Es la Fase 0 del componente mobile; debe completarse antes de SKILL-11 (room),
  SKILL-12 (repository), SKILL-13 (workmanager), SKILL-17 (hilt) y SKILL-18 (sunmi).
---

# SKILL-10 — Android Project Structure (apps/mobile)

## Stack
Kotlin · Jetpack Compose · MVVM + Clean Architecture · Hilt · Room · Retrofit 2
WorkManager · Sunmi Printer SDK (AIDL) · DataStore · Navigation Compose
Gradle Kotlin DSL · Android API 28+ (Sunmi V2SE)

---

## 1. Estructura de paquetes completa

```
apps/mobile/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   └── java/com/ltsoft/joyaspos/
│   │       ├── JoyasApp.kt                  # Application class con @HiltAndroidApp
│   │       ├── MainActivity.kt              # Entry point con @AndroidEntryPoint
│   │       │
│   │       ├── data/
│   │       │   ├── local/                   # Room — SQLite local
│   │       │   │   ├── JoyasDatabase.kt     # RoomDatabase con versión y migraciones
│   │       │   │   ├── entity/
│   │       │   │   │   ├── VentaEntity.kt
│   │       │   │   │   ├── VentaDetalleEntity.kt
│   │       │   │   │   └── ProductoEntity.kt
│   │       │   │   └── dao/
│   │       │   │       ├── VentaDao.kt
│   │       │   │       └── ProductoDao.kt
│   │       │   ├── remote/                  # Retrofit — API REST
│   │       │   │   ├── ApiService.kt        # Interfaz con todos los endpoints
│   │       │   │   ├── dto/                 # Data Transfer Objects (request/response)
│   │       │   │   │   ├── AuthDto.kt
│   │       │   │   │   ├── ProductoDto.kt
│   │       │   │   │   ├── VentaDto.kt
│   │       │   │   │   └── SyncDto.kt
│   │       │   │   └── interceptor/
│   │       │   │       └── AuthInterceptor.kt  # Agrega Bearer token
│   │       │   └── repository/              # Implementaciones del Repository Pattern
│   │       │       ├── VentaRepositoryImpl.kt
│   │       │       └── ProductoRepositoryImpl.kt
│   │       │
│   │       ├── domain/                      # Lógica de negocio pura (sin Android)
│   │       │   ├── model/                   # Modelos de dominio (no entidades Room ni DTOs)
│   │       │   │   ├── Venta.kt
│   │       │   │   ├── VentaItem.kt
│   │       │   │   └── Producto.kt
│   │       │   ├── repository/              # Interfaces (contratos)
│   │       │   │   ├── VentaRepository.kt
│   │       │   │   └── ProductoRepository.kt
│   │       │   └── usecase/                 # Casos de uso opcionales
│   │       │       └── RegistrarVentaUseCase.kt
│   │       │
│   │       ├── presentation/                # UI — Composables + ViewModels
│   │       │   ├── navigation/
│   │       │   │   ├── AppNavHost.kt        # NavHost con todas las rutas
│   │       │   │   └── Routes.kt            # Sealed class con nombres de rutas
│   │       │   ├── login/
│   │       │   │   ├── LoginScreen.kt
│   │       │   │   └── LoginViewModel.kt
│   │       │   ├── home/
│   │       │   │   ├── HomeScreen.kt
│   │       │   │   └── HomeViewModel.kt
│   │       │   ├── cart/
│   │       │   │   ├── CartScreen.kt
│   │       │   │   ├── CartViewModel.kt
│   │       │   │   └── AddItemDialog.kt
│   │       │   ├── confirmation/
│   │       │   │   └── SaleConfirmationScreen.kt
│   │       │   └── sales/
│   │       │       ├── SalesQueryScreen.kt
│   │       │       ├── SalesQueryViewModel.kt
│   │       │       └── SaleDetailScreen.kt
│   │       │
│   │       ├── worker/
│   │       │   └── SyncWorker.kt            # CoroutineWorker para sync offline→online
│   │       │
│   │       ├── print/
│   │       │   └── SunmiPrintHelper.kt      # Singleton para impresión térmica
│   │       │
│   │       └── di/                          # Módulos Hilt
│   │           ├── DatabaseModule.kt        # Provee Room, DAOs
│   │           ├── NetworkModule.kt         # Provee Retrofit, ApiService
│   │           ├── RepositoryModule.kt      # Bindea interfaces a implementaciones
│   │           └── PrintModule.kt           # Provee SunmiPrintHelper
│   │
│   ├── src/test/                            # Tests unitarios (ViewModel, UseCase)
│   ├── src/androidTest/                     # Tests instrumentados (Room, UI)
│   ├── build.gradle.kts                     # Config del módulo app
│   └── proguard-rules.pro
│
├── build.gradle.kts                         # Config raíz del proyecto
├── gradle/
│   └── libs.versions.toml                   # Version catalog
├── gradle.properties
├── local.properties                          # API_BASE_URL (no commitear)
└── settings.gradle.kts
```

---

## 2. Version Catalog (`gradle/libs.versions.toml`)

```toml
[versions]
kotlin = "1.9.23"
agp = "8.4.0"
compose-bom = "2024.05.00"
hilt = "2.51.1"
room = "2.6.1"
retrofit = "2.11.0"
okhttp = "4.12.0"
moshi = "1.15.1"
navigation-compose = "2.7.7"
workmanager = "2.9.0"
datastore = "1.1.1"
lifecycle = "2.8.1"
coroutines = "1.8.1"
coil = "2.6.0"

[libraries]
# Compose BOM
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-activity = { group = "androidx.activity", name = "activity-compose", version = "1.9.0" }

# Hilt
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version = "1.2.0" }
hilt-work = { group = "androidx.hilt", name = "hilt-work", version = "1.2.0" }
hilt-work-compiler = { group = "androidx.hilt", name = "hilt-compiler", version = "1.2.0" }

# Room
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }

# Retrofit + OkHttp + Moshi
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-moshi = { group = "com.squareup.retrofit2", name = "converter-moshi", version.ref = "retrofit" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
okhttp-logging = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }
moshi-kotlin = { group = "com.squareup.moshi", name = "moshi-kotlin", version.ref = "moshi" }
moshi-adapters = { group = "com.squareup.moshi", name = "moshi-adapters", version.ref = "moshi" }

# Navigation
navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation-compose" }

# WorkManager
workmanager-ktx = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "workmanager" }

# DataStore
datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }

# Lifecycle
lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycle" }
lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycle" }

# Coroutines
coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-kapt = { id = "org.jetbrains.kotlin.kapt", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

---

## 3. Build.gradle.kts raíz

### `build.gradle.kts` (raíz de apps/mobile)
```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.kapt) apply false
    alias(libs.plugins.hilt) apply false
}
```

---

## 4. Build.gradle.kts del módulo app

### `app/build.gradle.kts`
```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.ltsoft.joyaspos"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ltsoft.joyaspos"
        minSdk = 28                          // Android 9 — Sunmi V2SE
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        // Leer URL de la API desde local.properties
        val localProps = project.rootProject.file("local.properties")
            .takeIf { it.exists() }
            ?.let { java.util.Properties().apply { load(it.inputStream()) } }
        buildConfigField("String", "API_BASE_URL",
            "\"${localProps?.getProperty("API_BASE_URL") ?: "http://10.0.2.2:3000"}\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = true
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.13"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    // Room requiere esta config porque JoyasDatabase usa exportSchema = true
    // (ver SKILL-11). Los schemas JSON quedan en app/schemas/ para auditoría.
    kapt {
        arguments {
            arg("room.schemaLocation", "$projectDir/schemas")
        }
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Compose BOM
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.activity)
    debugImplementation(libs.compose.ui.tooling)

    // Navigation
    implementation(libs.navigation.compose)
    implementation(libs.hilt.navigation.compose)

    // Lifecycle
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Hilt
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.hilt.work)
    kapt(libs.hilt.work.compiler)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    kapt(libs.room.compiler)

    // Retrofit + OkHttp + Moshi
    implementation(libs.retrofit)
    implementation(libs.retrofit.moshi)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.moshi.kotlin)
    implementation(libs.moshi.adapters)

    // WorkManager
    implementation(libs.workmanager.ktx)

    // DataStore
    implementation(libs.datastore.preferences)

    // Coroutines
    implementation(libs.coroutines.android)

    // Sunmi Printer SDK — se agrega como archivo .aar local (ver sección 5)
}
```

---

## 5. Sunmi Printer SDK

El SDK de impresión Sunmi se distribuye como `.aar`. Pasos para incluirlo:

```
app/libs/
└── SunmiPrinterService.aar     # Descargar del portal Sunmi Developer
```

En `app/build.gradle.kts`, agregar en `dependencies`:
```kotlin
implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.aar", "*.jar"))))
```

Permisos en `AndroidManifest.xml`:
```xml
<!-- No se requieren permisos especiales; la impresora Sunmi usa AIDL interno -->
```

---

## 6. AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permisos de red -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:name=".JoyasApp"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.JoyasPOS"
        android:usesCleartextTraffic="true">   <!-- Solo para dev en red local; en release usar HTTPS -->

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!--
            WorkManager — DESHABILITAR el inicializador automático.
            JoyasApp implementa Configuration.Provider e inyecta HiltWorkerFactory.
            Ver SKILL-13 y SKILL-17 para los detalles.
        -->
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

    </application>
</manifest>
```

---

## 7. Clases de entrada

### `JoyasApp.kt`
```kotlin
package com.ltsoft.joyaspos

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.ltsoft.joyaspos.worker.WorkManagerSetup
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * Application class de la app.
 *
 * Implementa Configuration.Provider para que WorkManager use HiltWorkerFactory
 * y pueda inyectar las dependencias del SyncWorker.
 *
 * Por esto en AndroidManifest.xml el inicializador automático de WorkManager
 * está deshabilitado con tools:node="remove" (ver sección 6).
 */
@HiltAndroidApp
class JoyasApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        // Registrar el Worker periódico al arrancar la app (ver SKILL-13)
        WorkManagerSetup.initialize(this)
    }
}
```

### `MainActivity.kt`
```kotlin
package com.ltsoft.joyaspos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.ltsoft.joyaspos.presentation.navigation.AppNavHost
import com.ltsoft.joyaspos.ui.theme.JoyasPOSTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            JoyasPOSTheme {
                AppNavHost()
            }
        }
    }
}
```

---

## 8. `local.properties` (no commitear)

```properties
# Configuración local de desarrollo
sdk.dir=/Users/tuusuario/Library/Android/sdk

# URL de la API
# En emulador: 10.0.2.2 apunta al localhost de la máquina host
# En Sunmi real en red local: IP de la máquina donde corre la API
API_BASE_URL=http://10.0.2.2:3000
```

---

## 9. Reglas de arquitectura

1. **Los Composables NO acceden a Room ni a Retrofit** — solo observan StateFlow del ViewModel.
2. **Los ViewModels NO acceden a Room ni a Retrofit** — solo llaman métodos del Repository.
3. **Los Repositories son la única capa que coordina Room + API**.
4. **`domain/model/`** contiene modelos puros de Kotlin sin dependencias de Android.
5. **`domain/repository/`** contiene solo interfaces (contratos), sin implementaciones.
6. **`di/`** contiene todos los módulos Hilt; ningún `object` singleton manual.
7. **Nunca instanciar `SunmiPrintHelper` directamente** — siempre inyectado por Hilt.

---

## 10. Siguiente paso

Con la estructura lista:
- **SKILL-11** (`room-database`) — Implementar entidades, DAOs y JoyasDatabase
- **SKILL-14** (`retrofit-okhttp-setup`) — Configurar el cliente HTTP
- **SKILL-17** (`hilt-dependency-injection`) — Implementar todos los módulos Hilt
- **SKILL-19** (`datastore-preferences`) — Almacenamiento del JWT
