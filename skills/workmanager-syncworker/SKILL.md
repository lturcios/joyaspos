---
name: workmanager-syncworker
description: |
  Implementa el SyncWorker con WorkManager para la sincronización automática
  offline→online de ventas pendientes en la app Android de JoyasPOS. Cubre:
  CoroutineWorker con constraint de red, registro periódico (15 min) + inmediato
  (tras venta fallida), backoff exponencial (1→2→4→8→16 min, máx 5 reintentos),
  lotes de ≤20 ventas, manejo de éxito parcial, y la clase WorkManagerInitializer.
  Usar al implementar el SyncWorker por primera vez, al modificar la frecuencia
  o política de reintentos, al depurar por qué ventas no se están sincronizando,
  o al agregar nuevos tipos de sincronización background.
  Depende de SKILL-11 (room-database), SKILL-12 (repository-pattern-offline-first)
  y SKILL-17 (hilt-dependency-injection).
---

# SKILL-13 — WorkManager SyncWorker (apps/mobile)

## Paquete
`com.ltsoft.joyaspos.worker`

---

## 1. SyncWorker

### `worker/SyncWorker.kt`
```kotlin
package com.ltsoft.joyaspos.worker

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.data.remote.dto.VentaSyncPayload
import com.ltsoft.joyaspos.data.remote.dto.SyncVentasRequest
import com.ltsoft.joyaspos.data.remote.dto.VentaItemRequest
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * Worker que sincroniza ventas pendientes (sincronizado=false) con la API.
 *
 * Triggers:
 * - Periódico: cada 15 minutos (PeriodicWorkRequest)
 * - Al reconectar: constraint NetworkType.CONNECTED dispara todos los encolados
 * - Inmediato: OneTimeWorkRequest encolado tras POST /ventas fallido
 *
 * Backoff: exponencial, delay inicial 1 min, máx 5 intentos.
 * Lotes: máximo 20 ventas por llamada a POST /ventas/sync.
 * Éxito parcial: marca solo las que la API confirmó; las fallidas quedan pendientes.
 */
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val ventaRepository: VentaRepository,
    private val apiService: ApiService,
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "SyncWorker"
        const val WORK_NAME_PERIODIC = "sync_worker_periodic"
        const val WORK_NAME_ONETIME = "sync_worker_onetime"
        const val BATCH_SIZE = 20
        const val MAX_ATTEMPTS = 5
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "SyncWorker iniciado (intento ${runAttemptCount + 1}/$MAX_ATTEMPTS)")

        // Límite de reintentos — si se superan, abandonar (no perder datos, solo dejar de reintentar)
        if (runAttemptCount >= MAX_ATTEMPTS) {
            Log.w(TAG, "Máximo de reintentos alcanzado. Las ventas permanecen pendientes.")
            return Result.failure()
        }

        // Obtener todas las ventas pendientes de Room
        val pendientes = ventaRepository.getPendientes()

        if (pendientes.isEmpty()) {
            Log.d(TAG, "No hay ventas pendientes. Worker finaliza.")
            return Result.success()
        }

        Log.d(TAG, "Ventas pendientes encontradas: ${pendientes.size}")

        var todosExitosos = true

        // Procesar en lotes de BATCH_SIZE para no sobrecargar la API
        pendientes.chunked(BATCH_SIZE).forEach { lote ->
            val resultado = sincronizarLote(lote)
            if (!resultado) todosExitosos = false
        }

        return if (todosExitosos) {
            Log.d(TAG, "Todas las ventas sincronizadas exitosamente.")
            Result.success()
        } else {
            Log.w(TAG, "Algunas ventas fallaron. Reintentando con backoff...")
            Result.retry()  // WorkManager aplicará el backoff exponencial
        }
    }

    /**
     * Sincroniza un lote de ventas con POST /ventas/sync.
     * @return true si todas las ventas del lote se procesaron (aunque con errores parciales
     *         de negocio — errores de red retornan false para provocar retry).
     */
    private suspend fun sincronizarLote(
        lote: List<com.ltsoft.joyaspos.data.local.entity.VentaEntity>
    ): Boolean {
        return try {
            // Construir el payload del lote
            val payloads = lote.map { venta ->
                val items = ventaRepository.getDetallesByVentaId(venta.id)
                VentaSyncPayload(
                    localId = venta.id,
                    nombreCliente = venta.nombreCliente,
                    fechaHora = venta.fechaHora,
                    items = items.map { item ->
                        VentaItemRequest(
                            productoId = item.productoId,
                            cantidad = item.cantidad,
                            precioUnitario = item.precioUnitario,
                            detalleAdicional = item.detalleAdicional,  // ← cadena original
                        )
                    }
                )
            }

            val response = apiService.syncVentas(SyncVentasRequest(ventas = payloads))

            if (response.isSuccessful) {
                val body = response.body()
                    ?: return false  // 200 sin body — error inesperado

                // Marcar exitosas en Room
                body.sincronizadas.forEach { resultado ->
                    ventaRepository.marcarSincronizado(
                        localId = resultado.local_id,
                        remoteId = resultado.remote_id,
                    )
                    Log.d(TAG, "✅ Venta sincronizada: local=${resultado.local_id} → remote=${resultado.remote_id}")
                }

                // Loguear errores parciales (quedan con sincronizado=false para próximo intento)
                body.errores.forEach { error ->
                    Log.w(TAG, "⚠️ Error en venta localId=${error.local_id}: ${error.mensaje}")
                }

                // El lote fue procesado (aunque tenga errores parciales de negocio)
                true
            } else {
                Log.w(TAG, "API rechazó el lote: ${response.code()} ${response.message()}")
                false  // Provocará Result.retry() en el caller
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error de red al sincronizar lote: ${e.message}")
            false  // Sin conexión → retry
        }
    }
}
```

---

## 2. DTOs del sync (complemento a VentaDto.kt)

Agregar en `data/remote/dto/VentaDto.kt`:

```kotlin
@JsonClass(generateAdapter = true)
data class VentaSyncPayload(
    @Json(name = "local_id") val localId: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String?,
    @Json(name = "fecha_hora") val fechaHora: String?,
    val items: List<VentaItemRequest>,
)

@JsonClass(generateAdapter = true)
data class SyncVentasRequest(
    val ventas: List<VentaSyncPayload>,
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

Agregar en `ApiService.kt`:
```kotlin
@POST("ventas/sync")
suspend fun syncVentas(@Body request: SyncVentasRequest): Response<SyncVentasResponse>
```

---

## 3. WorkManagerSetup — registro de Workers al iniciar la app

### `worker/WorkManagerSetup.kt`
```kotlin
package com.ltsoft.joyaspos.worker

import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

object WorkManagerSetup {

    /**
     * Configura y registra todos los Workers de la app.
     * Llamar desde JoyasApp.onCreate() o desde el ViewModel de Login tras autenticarse.
     */
    fun initialize(context: Context) {
        registrarSyncPeriodico(context)
    }

    /**
     * Worker periódico: se ejecuta cada 15 minutos cuando hay red.
     *
     * ExistingPeriodicWorkPolicy.KEEP: si ya hay uno registrado con este nombre,
     * no lo reemplaza — evita duplicar el trabajo.
     */
    fun registrarSyncPeriodico(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val periodicRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            repeatInterval = 15,
            repeatIntervalTimeUnit = TimeUnit.MINUTES,
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,  // 1 minuto mínimo
                TimeUnit.MILLISECONDS,
            )
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            SyncWorker.WORK_NAME_PERIODIC,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicRequest,
        )
    }

    /**
     * Worker inmediato: se encola cuando una venta falla al intentar sincronizar.
     * Se ejecuta en cuanto hay conexión disponible.
     *
     * ExistingWorkPolicy.REPLACE: si ya hay uno pendiente, lo reemplaza para
     * evitar acumulación de Workers idénticos.
     */
    fun enqueueOneTimeSyncInmediato(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val oneTimeRequest = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                1,                    // delay inicial: 1 minuto
                TimeUnit.MINUTES,
            )
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            SyncWorker.WORK_NAME_ONETIME,
            ExistingWorkPolicy.REPLACE,
            oneTimeRequest,
        )
    }
}
```

---

## 4. Módulo Hilt para WorkManager

### `di/WorkerModule.kt`
```kotlin
package com.ltsoft.joyaspos.di

import com.ltsoft.joyaspos.worker.SyncWorker
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Hilt necesita saber que SyncWorker es un HiltWorker.
 * La anotación @HiltAndroidApp en JoyasApp + @HiltWorker en SyncWorker
 * son suficientes — no se necesita un módulo adicional.
 *
 * Este archivo existe para documentar que el Worker está gestionado por Hilt.
 * Si se agregan más Workers, anotar cada uno con @HiltWorker.
 */
@Module
@InstallIn(SingletonComponent::class)
object WorkerModule
```

---

## 5. Inicialización en JoyasApp

`JoyasApp` ya implementa `Configuration.Provider` con `HiltWorkerFactory`
inyectado (ver SKILL-10 sección 7 para el código completo). Aquí solo se
muestra el llamado a `WorkManagerSetup.initialize()`:

```kotlin
// JoyasApp.kt — ver SKILL-10 para el archivo completo
@HiltAndroidApp
class JoyasApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        // Registrar el Worker periódico al arrancar la app
        WorkManagerSetup.initialize(this)
    }
}
```

> **Requisito en AndroidManifest.xml:** el inicializador automático de
> WorkManager debe estar deshabilitado con `tools:node="remove"` para que
> `HiltWorkerFactory` sea reconocida. Ya configurado en SKILL-10 sección 6.

---

## 6. Integración con VentaRepository

Cuando `registrarVenta()` falla al contactar la API, el Repository debe
encolar el Worker inmediato. Actualizar `VentaRepositoryImpl`:

```kotlin
// En VentaRepositoryImpl.kt — en el bloque catch del intento online:
} catch (e: Exception) {
    Log.w(TAG, "Sin conexión al registrar venta (localId=$localId): ${e.message}")

    // Encolar sync inmediato para cuando vuelva la conexión
    WorkManagerSetup.enqueueOneTimeSyncInmediato(context)
}
```

Para acceder al Context en el Repository, inyectarlo vía Hilt:
```kotlin
@Singleton
class VentaRepositoryImpl @Inject constructor(
    private val ventaDao: VentaDao,
    private val apiService: ApiService,
    @ApplicationContext private val context: Context,   // ← agregar
) : VentaRepository { ... }
```

---

## 7. Política de backoff y reintentos

| Intento | Delay mínimo | Delay máximo |
|---|---|---|
| 1 (falla) | 1 min | 5 min |
| 2 | 2 min | 10 min |
| 3 | 4 min | 20 min |
| 4 | 8 min | 40 min |
| 5 (último) | 16 min | 80 min |
| 6+ | Worker abandona (`Result.failure()`) | — |

La política `KEEP` en el PeriodicWork garantiza que aunque la app se reinicie
varias veces, solo habrá un Worker periódico activo.

---

## 8. Observar el estado del Worker desde la UI

```kotlin
// En HomeViewModel — observar si hay sync en curso
val syncWorkInfo: StateFlow<WorkInfo?> = WorkManager
    .getInstance(getApplication())
    .getWorkInfosForUniqueWorkFlow(SyncWorker.WORK_NAME_ONETIME)
    .map { it.firstOrNull() }
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

// En HomeScreen — mostrar indicador de sincronización
val workInfo by viewModel.syncWorkInfo.collectAsStateWithLifecycle()
val isSyncing = workInfo?.state == WorkInfo.State.RUNNING
```

---

## 9. Depuración

```bash
# Ver Workers registrados y su estado (Android Studio)
# View → Tool Windows → App Inspection → Background Task Inspector

# Forzar ejecución inmediata del Worker periódico en debug:
adb shell am broadcast -a androidx.work.diagnostics.REQUEST_DIAGNOSTICS_V2
```

Logs útiles para filtrar en Logcat:
```
tag:SyncWorker
```
