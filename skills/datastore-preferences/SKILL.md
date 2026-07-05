---
name: datastore-preferences
description: |
  Implementa DataStore Preferences para almacenamiento persistente del JWT y datos
  de sesión en la app Android de JoyasPOS: clase SessionPreferences con métodos
  para guardar token, leer token como Flow, limpiar sesión, y leer datos del
  usuario logueado (id, username, rol). Usar al implementar el almacenamiento de
  sesión por primera vez, al agregar un dato nuevo que deba persistir entre
  reinicios (como preferencias de UI), al leer el token en el AuthInterceptor
  de Retrofit, o al depurar problemas de sesión (token que no persiste, usuario
  que se desloguea solo). Depende de SKILL-10 (android-project-structure).
---

# SKILL-19 — DataStore Preferences (apps/mobile)

## Paquete
`com.ltsoft.joyaspos.data.local.preferences`

---

## 1. Dependencia

En `gradle/libs.versions.toml` ya está definida:
```toml
datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
```

En `app/build.gradle.kts`:
```kotlin
implementation(libs.datastore.preferences)
```

---

## 2. Keys de preferencias

### `data/local/preferences/PreferenceKeys.kt`
```kotlin
package com.ltsoft.joyaspos.data.local.preferences

import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey

/**
 * Claves tipadas para todas las preferencias almacenadas.
 * Centralizar aquí evita errores de tipeo en strings dispersos por el código.
 */
object PreferenceKeys {
    val JWT_TOKEN = stringPreferencesKey("jwt_token")
    val USER_ID = longPreferencesKey("user_id")
    val USERNAME = stringPreferencesKey("username")
    val NOMBRE_COMPLETO = stringPreferencesKey("nombre_completo")
    val ROL = stringPreferencesKey("rol")   // "admin" | "vendedor"
}
```

---

## 3. SessionPreferences

### `data/local/preferences/SessionPreferences.kt`
```kotlin
package com.ltsoft.joyaspos.data.local.preferences

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Wrapper de DataStore para la sesión del usuario.
 *
 * Todos los métodos de lectura devuelven Flow — se consumen con
 * .firstOrNull() en coroutines o con collectAsStateWithLifecycle() en Compose.
 *
 * NUNCA almacenar la contraseña — solo el token JWT.
 */
@Singleton
class SessionPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    // ── Lectura ───────────────────────────────────────────────────────────────

    /** Flow del token JWT. Null si no hay sesión activa. */
    fun getToken(): Flow<String?> = dataStore.data.map { prefs ->
        prefs[PreferenceKeys.JWT_TOKEN]
    }

    /** Flow del ID del usuario logueado. */
    fun getUserId(): Flow<Long?> = dataStore.data.map { prefs ->
        prefs[PreferenceKeys.USER_ID]
    }

    /** Flow del username. */
    fun getUsername(): Flow<String?> = dataStore.data.map { prefs ->
        prefs[PreferenceKeys.USERNAME]
    }

    /** Flow del nombre completo del usuario. */
    fun getNombreCompleto(): Flow<String?> = dataStore.data.map { prefs ->
        prefs[PreferenceKeys.NOMBRE_COMPLETO]
    }

    /** Flow del rol ("admin" | "vendedor"). */
    fun getRol(): Flow<String?> = dataStore.data.map { prefs ->
        prefs[PreferenceKeys.ROL]
    }

    /**
     * Flow combinado con todos los datos de sesión.
     * Útil para mostrar info del usuario en la UI sin múltiples colectores.
     */
    fun getSessionData(): Flow<SessionData?> = dataStore.data.map { prefs ->
        val token = prefs[PreferenceKeys.JWT_TOKEN]
        if (token.isNullOrBlank()) {
            null
        } else {
            SessionData(
                token = token,
                userId = prefs[PreferenceKeys.USER_ID] ?: 0L,
                username = prefs[PreferenceKeys.USERNAME] ?: "",
                nombreCompleto = prefs[PreferenceKeys.NOMBRE_COMPLETO] ?: "",
                rol = prefs[PreferenceKeys.ROL] ?: "vendedor",
            )
        }
    }

    // ── Escritura ─────────────────────────────────────────────────────────────

    /**
     * Guarda todos los datos de sesión tras un login exitoso.
     * Llamar solo cuando la API retorna HTTP 200 con token válido.
     */
    suspend fun saveSession(
        token: String,
        userId: Long,
        username: String,
        nombreCompleto: String,
        rol: String,
    ) {
        dataStore.edit { prefs ->
            prefs[PreferenceKeys.JWT_TOKEN] = token
            prefs[PreferenceKeys.USER_ID] = userId
            prefs[PreferenceKeys.USERNAME] = username
            prefs[PreferenceKeys.NOMBRE_COMPLETO] = nombreCompleto
            prefs[PreferenceKeys.ROL] = rol
        }
    }

    /**
     * Limpia TODOS los datos de sesión.
     * Llamar en: logout manual, token expirado (401), cierre de sesión forzado.
     */
    suspend fun clearSession() {
        dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}

/** Datos de sesión del usuario actualmente logueado. */
data class SessionData(
    val token: String,
    val userId: Long,
    val username: String,
    val nombreCompleto: String,
    val rol: String,    // "admin" | "vendedor"
) {
    val isAdmin: Boolean get() = rol == "admin"
}
```

---

## 4. Módulo Hilt

### `di/DataStoreModule.kt`
```kotlin
package com.ltsoft.joyaspos.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

// Extensión de Context — crea el DataStore una sola vez
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
    name = "joyas_session"
)

@Module
@InstallIn(SingletonComponent::class)
object DataStoreModule {

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        context.dataStore

    @Provides
    @Singleton
    fun provideSessionPreferences(
        dataStore: DataStore<Preferences>
    ): SessionPreferences = SessionPreferences(dataStore)
}
```

---

## 5. Uso en ViewModels

```kotlin
// Verificar si hay sesión activa (para la pantalla de inicio)
val isAuthenticated: StateFlow<Boolean> = sessionPreferences
    .getToken()
    .map { token -> !token.isNullOrBlank() }
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

// Mostrar nombre del usuario en el toolbar
val sessionData: StateFlow<SessionData?> = sessionPreferences
    .getSessionData()
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

// Logout
fun logout() {
    viewModelScope.launch {
        sessionPreferences.clearSession()
        // La navegación al Login se dispara automáticamente porque
        // isAuthenticated emite false cuando el token se limpia
    }
}
```

---

## 6. Uso en el AuthInterceptor (lectura síncrona)

```kotlin
// En AuthInterceptor.kt — hilo IO de OkHttp
val token = runBlocking {
    sessionPreferences.getToken().firstOrNull()
}
```

`runBlocking` es aceptable aquí porque:
- Se ejecuta en el hilo IO de OkHttp, no en el Main thread
- `firstOrNull()` retorna inmediatamente si DataStore ya tiene el valor en caché
- Es el patrón estándar para leer DataStore en interceptores OkHttp

---

## 7. Reglas

1. **Nunca almacenar la contraseña** — solo el token JWT.
2. **`clearSession()` limpia todo** — siempre llamar en logout Y en 401.
3. **`saveSession()` solo se llama** tras recibir HTTP 200 de `/auth/login`.
4. **DataStore es asíncrono** — nunca leer con `.value` directamente; siempre con Flow o `firstOrNull()`.
5. **Una sola instancia** de `DataStore` por archivo de preferencias — la extensión `by preferencesDataStore` garantiza esto.
6. **El nombre del archivo `"joyas_session"`** no debe cambiar en producción — cambiar el nombre crea un DataStore nuevo y vacío, lo que desloguea a todos los usuarios.
