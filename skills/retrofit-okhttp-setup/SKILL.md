---
name: retrofit-okhttp-setup
description: |
  Configura el cliente HTTP de la app Android de JoyasPOS: Retrofit 2 + OkHttp3
  con interceptor de JWT automático, manejo de errores 401 (limpiar sesión y
  redirigir a Login), timeouts, logging en debug, y la interfaz ApiService con
  todos los endpoints del proyecto. Usar al configurar el cliente HTTP por primera
  vez, al agregar un endpoint nuevo a ApiService, al depurar errores de red o
  de autenticación (401/403), o al ajustar políticas de timeout.
  Depende de SKILL-10 (android-project-structure) y SKILL-19 (datastore-preferences)
  para leer el token. Complementar con SKILL-17 (hilt-dependency-injection) para
  proveer el cliente via Hilt.
---

# SKILL-14 — Retrofit + OkHttp Setup (apps/mobile)

## Paquete base
`com.ltsoft.joyaspos.data.remote`

---

## 1. ApiService — interfaz completa

### `data/remote/ApiService.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote

import com.ltsoft.joyaspos.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ── AUTH ──────────────────────────────────────────────────────────────────
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // ── PRODUCTOS ─────────────────────────────────────────────────────────────
    @GET("productos")
    suspend fun getProductos(): Response<List<ProductoDto>>

    // ── VENTAS ────────────────────────────────────────────────────────────────
    @POST("ventas")
    suspend fun createVenta(@Body request: CreateVentaRequest): Response<VentaResponse>

    @POST("ventas/sync")
    suspend fun syncVentas(@Body request: SyncVentasRequest): Response<SyncVentasResponse>

    @GET("ventas")
    suspend fun getVentas(
        @Query("desde") desde: String,
        @Query("hasta") hasta: String,
    ): Response<List<VentaResumenDto>>

    @GET("ventas/{id}")
    suspend fun getVentaById(@Path("id") id: Long): Response<VentaDetalleDto>
}
```

---

## 2. DTOs de red

### `data/remote/dto/AuthDto.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(
    val username: String,
    val password: String,
)

@JsonClass(generateAdapter = true)
data class LoginResponse(
    val token: String,
    val user: UserDto,
)

@JsonClass(generateAdapter = true)
data class UserDto(
    val id: Long,
    val username: String,
    @Json(name = "nombre_completo") val nombreCompleto: String,
    val rol: String,
)
```

### `data/remote/dto/ProductoDto.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ProductoDto(
    val id: Long,
    val nombre: String,
    @Json(name = "unidad_medida") val unidad_medida: String,
    val existencia: Double,
    val activo: Boolean,
)
```

### `data/remote/dto/VentaDto.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ── Requests ──────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class VentaItemRequest(
    @Json(name = "producto_id") val productoId: Long,
    val cantidad: Double,
    @Json(name = "precio_unitario") val precioUnitario: Double,
    @Json(name = "detalle_adicional") val detalleAdicional: String? = null,
)

@JsonClass(generateAdapter = true)
data class CreateVentaRequest(
    @Json(name = "nombre_cliente") val nombreCliente: String?,
    @Json(name = "fecha_hora") val fechaHora: String?,
    val items: List<VentaItemRequest>,
)

@JsonClass(generateAdapter = true)
data class VentaSyncPayload(
    @Json(name = "local_id") val localId: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String?,
    @Json(name = "fecha_hora") val fechaHora: String?,
    val items: List<VentaItemRequest>,
)

@JsonClass(generateAdapter = true)
data class SyncVentasRequest(val ventas: List<VentaSyncPayload>)

// ── Responses ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class VentaResponse(
    val id: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String,
    @Json(name = "monto_total") val montoTotal: Double,
    @Json(name = "fecha_hora") val fechaHora: String,
)

@JsonClass(generateAdapter = true)
data class VentaResumenDto(
    val id: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String,
    @Json(name = "monto_total") val montoTotal: Double,
    @Json(name = "fecha_hora") val fechaHora: String,
    val vendedor: String,
)

@JsonClass(generateAdapter = true)
data class VentaDetalleItemDto(
    val id: Long,
    @Json(name = "producto_id") val productoId: Long,
    val detalle: String,
    val cantidad: Double,
    @Json(name = "precio_unitario") val precioUnitario: Double,
    val total: Double,
)

@JsonClass(generateAdapter = true)
data class VentaDetalleDto(
    val id: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String,
    @Json(name = "monto_total") val montoTotal: Double,
    @Json(name = "fecha_hora") val fechaHora: String,
    val vendedor: String,
    val items: List<VentaDetalleItemDto>,
)

@JsonClass(generateAdapter = true)
data class SyncResultItem(
    val local_id: Long,
    val remote_id: Long,
)

@JsonClass(generateAdapter = true)
data class SyncErrorItem(
    val local_id: Long,
    val mensaje: String,
)

@JsonClass(generateAdapter = true)
data class SyncVentasResponse(
    val sincronizadas: List<SyncResultItem>,
    val errores: List<SyncErrorItem>,
)
```

---

## 3. Interceptor de autenticación

### `data/remote/interceptor/AuthInterceptor.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote.interceptor

import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

/**
 * Interceptor OkHttp que agrega el header Authorization: Bearer <token>
 * en cada request que no sea el endpoint de login.
 *
 * Lee el token de DataStore de forma síncrona usando runBlocking.
 * Esto es aceptable en un interceptor de red (hilo de IO), no en el main thread.
 */
class AuthInterceptor @Inject constructor(
    private val sessionPreferences: SessionPreferences,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // No agregar token al endpoint de login
        if (originalRequest.url.encodedPath.contains("auth/login")) {
            return chain.proceed(originalRequest)
        }

        // Leer token de DataStore sincrónicamente
        val token = runBlocking {
            sessionPreferences.getToken().firstOrNull()
        }

        val request = if (!token.isNullOrBlank()) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(request)
    }
}
```

---

## 4. Interceptor de respuesta 401

### `data/remote/interceptor/UnauthorizedInterceptor.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote.interceptor

import android.content.Context
import android.content.Intent
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

/**
 * Interceptor que detecta respuestas 401 (token expirado o inválido).
 * Al recibir 401: limpia el token de DataStore y emite un broadcast
 * para que la UI navegue al Login.
 */
class UnauthorizedInterceptor @Inject constructor(
    @ApplicationContext private val context: Context,
    private val sessionPreferences: SessionPreferences,
) : Interceptor {

    companion object {
        const val ACTION_UNAUTHORIZED = "com.ltsoft.joyaspos.UNAUTHORIZED"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())

        if (response.code == 401) {
            // Limpiar sesión
            runBlocking { sessionPreferences.clearSession() }

            // Notificar a la UI vía broadcast local
            context.sendBroadcast(Intent(ACTION_UNAUTHORIZED))
        }

        return response
    }
}
```

Registrar el receiver en `MainActivity` para navegar al Login:
```kotlin
// MainActivity.kt
private val unauthorizedReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == UnauthorizedInterceptor.ACTION_UNAUTHORIZED) {
            // Navegar al Login limpiando el back stack
            navController.navigate(Routes.LOGIN) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
}

override fun onResume() {
    super.onResume()
    val filter = IntentFilter(UnauthorizedInterceptor.ACTION_UNAUTHORIZED)
    registerReceiver(unauthorizedReceiver, filter, RECEIVER_NOT_EXPORTED)
}

override fun onPause() {
    super.onPause()
    unregisterReceiver(unauthorizedReceiver)
}
```

---

## 5. Módulo Hilt de red

### `di/NetworkModule.kt`
```kotlin
package com.ltsoft.joyaspos.di

import com.ltsoft.joyaspos.BuildConfig
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.data.remote.interceptor.AuthInterceptor
import com.ltsoft.joyaspos.data.remote.interceptor.UnauthorizedInterceptor
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG)
                HttpLoggingInterceptor.Level.BODY
            else
                HttpLoggingInterceptor.Level.NONE
        }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        unauthorizedInterceptor: UnauthorizedInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)           // 1. Agregar JWT
        .addInterceptor(unauthorizedInterceptor)   // 2. Detectar 401
        .addInterceptor(loggingInterceptor)        // 3. Log (solo debug)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        moshi: Moshi,
    ): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL + "/")   // la "/" final es obligatoria
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService =
        retrofit.create(ApiService::class.java)
}
```

---

## 6. Reglas

1. **La `"/"` al final de `baseUrl` es obligatoria** en Retrofit — sin ella las rutas relativas fallan.
2. **Nunca poner la URL base hardcodeada** — siempre desde `BuildConfig.API_BASE_URL` (definido en `build.gradle.kts` vía `local.properties`).
3. **`runBlocking` en interceptores es aceptable** — se ejecutan en el hilo IO de OkHttp, nunca en el main thread.
4. **El orden de los interceptores importa** — Auth antes de Unauthorized antes de Logging.
5. **`HttpLoggingInterceptor.Level.BODY` solo en debug** — en release podría exponer datos sensibles en logs.
