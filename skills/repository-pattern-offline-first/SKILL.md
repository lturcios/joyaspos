---
name: repository-pattern-offline-first
description: |
  Implementa el Repository Pattern con estrategia local-first para la app Android
  de JoyasPOS: VentaRepository (escribe en Room ANTES de intentar la API, gestiona
  el flag sincronizado) y ProductoRepository (Room como Single Source of Truth,
  red actualiza el caché en background). Usar al implementar los repositorios por
  primera vez, al agregar una operación nueva que requiera coordinación entre Room
  y la API, o al depurar problemas donde ventas no se sincronizan o productos
  no se refrescan correctamente. El Repository es la única capa que coordina
  Room + Retrofit — ViewModels y Workers nunca acceden directamente a DAOs ni
  a ApiService.
  Depende de SKILL-10 (android-project-structure), SKILL-11 (room-database)
  y SKILL-14 (retrofit-okhttp-setup).
---

# SKILL-12 — Repository Pattern Offline-First (apps/mobile)

## Principio arquitectónico

```
ViewModel / Worker
      │
      ▼ (llama métodos del Repository)
  Repository  ←── única capa con acceso a Room Y Retrofit
      │                    │
      ▼                    ▼
  Room DAO           ApiService (Retrofit)
  (siempre primero)  (intento secundario)
```

---

## 1. Interfaces de dominio

Las interfaces van en `domain/repository/` y definen el contrato sin depender
de implementaciones concretas (Room, Retrofit).

### `domain/repository/VentaRepository.kt`
```kotlin
package com.ltsoft.joyaspos.domain.repository

import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import kotlinx.coroutines.flow.Flow

interface VentaRepository {
    /**
     * Registra una venta nueva.
     * Estrategia: INSERT en Room primero (siempre), luego intenta API.
     * El flag sincronizado refleja si la API confirmó.
     *
     * @return ID local de Room (inmediato, antes de conocer el resultado de la API)
     */
    suspend fun registrarVenta(
        venta: VentaEntity,
        items: List<VentaDetalleEntity>,
    ): Long

    /** Flow de todas las ventas de un período (fuente: Room) */
    fun getVentasPorPeriodo(desde: String, hasta: String): Flow<List<VentaEntity>>

    /** Flow del conteo de ventas pendientes de sync */
    fun countPendientes(): Flow<Int>

    /** Lista puntual de ventas pendientes (para SyncWorker) */
    suspend fun getPendientes(): List<VentaEntity>

    /** Items de una venta específica */
    suspend fun getDetallesByVentaId(ventaLocalId: Long): List<VentaDetalleEntity>

    /** Marca una venta como sincronizada y le asigna el remoteId */
    suspend fun marcarSincronizado(localId: Long, remoteId: Long)
}
```

### `domain/repository/ProductoRepository.kt`
```kotlin
package com.ltsoft.joyaspos.domain.repository

import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import kotlinx.coroutines.flow.Flow

interface ProductoRepository {
    /**
     * Flow de productos activos (fuente: Room).
     * Emite inmediatamente con el caché local.
     * Intenta refrescar desde la API en background cuando hay red.
     */
    fun getProductos(): Flow<List<ProductoEntity>>

    /**
     * Fuerza una sincronización de productos con la API.
     * Llama en login y al reconectar.
     * @return true si la sincronización fue exitosa
     */
    suspend fun syncProductos(): Boolean
}
```

---

## 2. Implementación de VentaRepository

### `data/repository/VentaRepositoryImpl.kt`
```kotlin
package com.ltsoft.joyaspos.data.repository

import android.util.Log
import com.ltsoft.joyaspos.data.local.dao.VentaDao
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.data.remote.dto.toCreateVentaRequest
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VentaRepositoryImpl @Inject constructor(
    private val ventaDao: VentaDao,
    private val apiService: ApiService,
) : VentaRepository {

    companion object {
        private const val TAG = "VentaRepository"
    }

    /**
     * FLUJO LOCAL-FIRST:
     * 1. INSERT en Room con sincronizado=false  ← SIEMPRE, ocurra lo que ocurra
     * 2. Intentar POST /ventas a la API
     * 3. Si OK (201) → marcar sincronizado=true, remoteId=id_mysql
     * 4. Si falla → quedar con sincronizado=false (SyncWorker lo reintentará)
     *
     * @return localId — disponible inmediatamente tras el paso 1
     */
    override suspend fun registrarVenta(
        venta: VentaEntity,
        items: List<VentaDetalleEntity>,
    ): Long {
        // ── PASO 1: Persistir en Room (SIEMPRE, sin excepción) ──────────────
        val localId = ventaDao.insertVenta(venta)
        val itemsConLocalId = items.map { it.copy(ventaLocalId = localId) }
        ventaDao.insertDetalles(itemsConLocalId)

        Log.d(TAG, "Venta insertada en Room: localId=$localId")

        // ── PASO 2: Intentar sincronizar con la API ──────────────────────────
        try {
            val request = venta.toCreateVentaRequest(itemsConLocalId)
            val response = apiService.createVenta(request)

            if (response.isSuccessful) {
                val remoteId = response.body()?.id
                    ?: throw IllegalStateException("API retornó 201 sin body")

                // ── PASO 3: Marcar sincronizado en Room ──────────────────────
                ventaDao.marcarSincronizado(localId = localId, remoteId = remoteId)
                Log.d(TAG, "Venta sincronizada: localId=$localId → remoteId=$remoteId")
            } else {
                // API retornó 4xx/5xx — quedará como pendiente
                Log.w(TAG, "API rechazó la venta: ${response.code()} ${response.message()}")
            }
        } catch (e: Exception) {
            // Error de red u otro — la venta queda en Room con sincronizado=false
            // SyncWorker la reintentará cuando haya conexión
            Log.w(TAG, "Sin conexión al registrar venta (localId=$localId): ${e.message}")
        }

        // Retornar el localId inmediatamente (la UI no espera al resultado de la API)
        return localId
    }

    override fun getVentasPorPeriodo(desde: String, hasta: String): Flow<List<VentaEntity>> =
        ventaDao.getPorPeriodo(desde = desde, hasta = hasta)

    override fun countPendientes(): Flow<Int> =
        ventaDao.countPendientes()

    override suspend fun getPendientes(): List<VentaEntity> =
        ventaDao.getPendientesList()

    override suspend fun getDetallesByVentaId(ventaLocalId: Long): List<VentaDetalleEntity> =
        ventaDao.getDetallesByVentaId(ventaLocalId)

    override suspend fun marcarSincronizado(localId: Long, remoteId: Long) =
        ventaDao.marcarSincronizado(localId = localId, remoteId = remoteId)
}
```

---

## 3. Implementación de ProductoRepository

### `data/repository/ProductoRepositoryImpl.kt`
```kotlin
package com.ltsoft.joyaspos.data.repository

import android.util.Log
import com.ltsoft.joyaspos.data.local.dao.ProductoDao
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.domain.repository.ProductoRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductoRepositoryImpl @Inject constructor(
    private val productoDao: ProductoDao,
    private val apiService: ApiService,
) : ProductoRepository {

    companion object {
        private const val TAG = "ProductoRepository"
    }

    /**
     * Emite siempre desde Room (Single Source of Truth).
     * El primer emisión es inmediata con el caché local.
     * En background, intenta refrescar desde la API.
     *
     * El Flow es frío — cada collector activo recibe actualizaciones automáticas
     * cuando Room detecta cambios (ej: después de upsertAll).
     */
    override fun getProductos(): Flow<List<ProductoEntity>> {
        return productoDao.getTodos()
        // Nota: el refresh de la API se dispara desde el ViewModel al iniciar
        // HomeScreen, no aquí. El Repository solo provee el Flow de Room.
    }

    /**
     * Descarga el catálogo completo de la API y lo persiste en Room.
     * Llamar en: login exitoso, reconexión de red, pull-to-refresh.
     *
     * @return true si la sincronización fue exitosa
     */
    override suspend fun syncProductos(): Boolean {
        return try {
            val response = apiService.getProductos()
            if (response.isSuccessful) {
                val productos = response.body() ?: emptyList()
                val entities = productos.map { dto ->
                    ProductoEntity(
                        id = dto.id,
                        nombre = dto.nombre,
                        unidadMedida = dto.unidad_medida,
                        existencia = dto.existencia,
                        activo = dto.activo,
                        ultimaSync = System.currentTimeMillis(),
                    )
                }
                productoDao.upsertAll(entities)
                Log.d(TAG, "Productos sincronizados: ${entities.size}")
                true
            } else {
                Log.w(TAG, "API rechazó getProductos: ${response.code()}")
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sin conexión al sincronizar productos: ${e.message}")
            false
        }
    }
}
```

---

## 4. DTOs y mappers

### `data/remote/dto/VentaDto.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ── Request ──────────────────────────────────────────────────────────────────

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

// ── Response ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class VentaResponse(
    val id: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String,
    @Json(name = "monto_total") val montoTotal: Double,
    @Json(name = "fecha_hora") val fechaHora: String,
)
```

### `data/remote/dto/Mappers.kt`
```kotlin
package com.ltsoft.joyaspos.data.remote.dto

import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity

/**
 * Convierte una VentaEntity + sus items a un CreateVentaRequest para la API.
 *
 * IMPORTANTE: se envía `detalleAdicional` (cadena original ingresada por el
 * usuario), NO `detalle` (concatenado local). El servidor reconstruye la
 * cadena final como "{nombre_producto} {detalle_adicional}".trim() para
 * mantener consistencia entre el detalle local en Room y el remoto en MySQL.
 */
fun VentaEntity.toCreateVentaRequest(
    items: List<VentaDetalleEntity>
): CreateVentaRequest {
    return CreateVentaRequest(
        nombreCliente = nombreCliente,
        fechaHora = fechaHora,
        items = items.map { item ->
            VentaItemRequest(
                productoId = item.productoId,
                cantidad = item.cantidad,
                precioUnitario = item.precioUnitario,
                detalleAdicional = item.detalleAdicional,  // ← cadena original, no null
            )
        }
    )
}
```

---

## 5. Módulo Hilt para Repositories

### `di/RepositoryModule.kt`
```kotlin
package com.ltsoft.joyaspos.di

import com.ltsoft.joyaspos.data.repository.ProductoRepositoryImpl
import com.ltsoft.joyaspos.data.repository.VentaRepositoryImpl
import com.ltsoft.joyaspos.domain.repository.ProductoRepository
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindVentaRepository(
        impl: VentaRepositoryImpl
    ): VentaRepository

    @Binds
    @Singleton
    abstract fun bindProductoRepository(
        impl: ProductoRepositoryImpl
    ): ProductoRepository
}
```

---

## 6. Uso en ViewModel (ejemplo)

```kotlin
@HiltViewModel
class CartViewModel @Inject constructor(
    private val ventaRepository: VentaRepository,  // interface, no impl
) : ViewModel() {

    fun confirmarVenta(venta: VentaEntity, items: List<VentaDetalleEntity>) {
        viewModelScope.launch {
            val localId = ventaRepository.registrarVenta(venta, items)
            // localId disponible inmediatamente para navegar a la confirmación
            // El flag sincronizado se actualiza en background automáticamente
            _uiState.value = CartUiState.VentaConfirmada(localId)
        }
    }
}
```

---

## 7. Reglas de la capa Repository

1. **El Repository escribe en Room ANTES de intentar la API** — sin excepción.
2. **Nunca lanzar excepción al fallar la API** en `registrarVenta` — solo loguear y dejar pendiente.
3. **Nunca acceder a Room desde un ViewModel directamente** — siempre via Repository.
4. **Nunca acceder a ApiService desde un ViewModel directamente** — siempre via Repository.
5. **Los Flows siempre emiten desde Room** — Room es el Single Source of Truth.
6. **`syncProductos()` no bloquea la UI** — llamar desde `viewModelScope.launch`.
