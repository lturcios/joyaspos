package com.ltsoft.joyaspos.data.repository

import android.content.Context
import android.util.Log
import com.ltsoft.joyaspos.data.local.JoyasDatabase
import com.ltsoft.joyaspos.data.local.dao.ProductoDao
import com.ltsoft.joyaspos.data.local.dao.VentaDao
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.data.remote.dto.SyncVentasRequest
import com.ltsoft.joyaspos.data.remote.dto.VentaItemRequest
import com.ltsoft.joyaspos.data.remote.dto.VentaSyncPayload
import com.ltsoft.joyaspos.data.remote.dto.toCreateVentaRequest
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import com.ltsoft.joyaspos.worker.WorkManagerSetup
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VentaRepositoryImpl @Inject constructor(
    private val ventaDao: VentaDao,
    private val productoDao: ProductoDao,
    private val apiService: ApiService,
    private val database: JoyasDatabase,
    private val sessionPreferences: SessionPreferences,
    @ApplicationContext private val context: Context,
) : VentaRepository {

    companion object {
        private const val TAG = "VentaRepository"
    }

    // Guard: descargarHistorial runs at most once per process lifetime (= per login session).
    // VentaRepositoryImpl is @Singleton so this flag resets only when the process dies.
    @Volatile private var historialDescargado = false

    override suspend fun registrarVenta(
        venta: VentaEntity,
        items: List<VentaDetalleEntity>,
        sucursalId: Long?,
    ): Long {
        // STEP 1: Always insert to Room first (offline-first)
        val localId = ventaDao.insertVenta(venta)
        val itemsConLocalId = items.map { it.copy(ventaLocalId = localId) }
        ventaDao.insertDetalles(itemsConLocalId)
        Log.d(TAG, "Venta insertada en Room: localId=$localId")

        // STEP 1b: Decrement local stock immediately so the UI reflects it without waiting for sync
        itemsConLocalId.forEach { item ->
            productoDao.decrementarExistencia(productoId = item.productoId, cantidad = item.cantidad)
        }

        // STEP 2: Attempt API sync
        try {
            val request = venta.toCreateVentaRequest(itemsConLocalId, sucursalId)
            val response = apiService.createVenta(request)
            if (response.isSuccessful) {
                val remoteId = response.body()?.id
                    ?: throw IllegalStateException("API retornó 201 sin body")
                // STEP 3: Only mark synced on HTTP 201
                ventaDao.marcarSincronizado(localId = localId, remoteId = remoteId)
                Log.d(TAG, "Venta sincronizada: localId=$localId → remoteId=$remoteId")
            } else {
                Log.w(TAG, "API rechazó la venta: ${response.code()} ${response.message()}")
                WorkManagerSetup.enqueueOneTimeSyncInmediato(context)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sin conexión al registrar venta (localId=$localId): ${e.message}")
            WorkManagerSetup.enqueueOneTimeSyncInmediato(context)
        }
        return localId
    }

    override fun getVentasPorPeriodo(desde: String, hasta: String): Flow<List<VentaEntity>> =
        ventaDao.getPorPeriodo(desde = desde, hasta = hasta)

    override fun countPendientes(): Flow<Int> = ventaDao.countPendientes()

    override suspend fun countPendientesOnce(): Int = ventaDao.countPendientesOnce()

    override suspend fun clearAllTables() {
        withContext(Dispatchers.IO) { database.clearAllTables() }
    }

    override suspend fun getPendientes(): List<VentaEntity> = ventaDao.getPendientesList()

    override suspend fun getVentaById(localId: Long): VentaEntity? = ventaDao.getById(localId)

    override suspend fun getDetallesByVentaId(ventaLocalId: Long): List<VentaDetalleEntity> =
        ventaDao.getDetallesByVentaId(ventaLocalId)

    override suspend fun marcarSincronizado(localId: Long, remoteId: Long) =
        ventaDao.marcarSincronizado(localId = localId, remoteId = remoteId)

    override fun resetHistorialFlag() {
        historialDescargado = false
    }

    override suspend fun sincronizarPendientes() {
        val ok = uploadPendientes()
        if (!ok) WorkManagerSetup.enqueueOneTimeSyncInmediato(context)
    }

    override suspend fun uploadPendientes(): Boolean {
        val pendientes = ventaDao.getPendientesList()
        if (pendientes.isEmpty()) return true
        // Resolve the sucursal_id for the current session once before processing the batch
        val session = sessionPreferences.getSessionData().firstOrNull()
        val sucursalIdParaApi: Long? = if (session?.isAdmin == true) session.sucursalId else null
        var todosExitosos = true
        pendientes.chunked(20).forEach { lote ->
            if (!sincronizarLote(lote, sucursalIdParaApi)) todosExitosos = false
        }
        return todosExitosos
    }

    private suspend fun sincronizarLote(lote: List<VentaEntity>, sucursalIdParaApi: Long?): Boolean {
        return try {
            val payloads = lote.map { venta ->
                val items = ventaDao.getDetallesByVentaId(venta.id)
                VentaSyncPayload(
                    localId = venta.id,
                    nombreCliente = venta.nombreCliente,
                    fechaHora = normalizarFechaHora(venta.fechaHora),
                    sucursalId = sucursalIdParaApi,
                    items = items.map { item ->
                        VentaItemRequest(
                            productoId = item.productoId,
                            cantidad = item.cantidad,
                            precioUnitario = item.precioUnitario,
                            detalleAdicional = item.detalle,
                        )
                    },
                )
            }
            val response = apiService.syncVentas(SyncVentasRequest(ventas = payloads))
            if (response.isSuccessful) {
                response.body()?.sincronizadas?.forEach { r ->
                    ventaDao.marcarSincronizado(localId = r.local_id, remoteId = r.remote_id)
                }
                response.body()?.errores?.forEach { e ->
                    Log.w(TAG, "Error en venta ${e.local_id}: ${e.mensaje}")
                }
                true
            } else {
                Log.w(TAG, "API rechazó sync: ${response.code()}")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error en sync lote: ${e.message}")
            false
        }
    }

    private fun normalizarFechaHora(fechaHora: String): String {
        if (!fechaHora.endsWith("Z") && !fechaHora.contains("+") &&
            !fechaHora.matches(Regex(".*-\\d{2}:\\d{2}$"))) return fechaHora
        return try {
            Instant.parse(fechaHora)
                .atZone(ZoneId.of("America/El_Salvador"))
                .toLocalDateTime()
                .toString()
        } catch (e: Exception) {
            Log.w(TAG, "fechaHora no reconocida, enviando sin modificar: $fechaHora")
            fechaHora
        }
    }

    override suspend fun descargarHistorial() {
        if (historialDescargado) {
            Log.d(TAG, "Historial ya descargado esta sesión, omitiendo.")
            return
        }
        historialDescargado = true
        try {
            val sv = ZoneId.of("America/El_Salvador")
            val hoy = LocalDate.now(sv)
            val desde = hoy.minusDays(6).toString()
            val hasta = hoy.toString()

            val response = apiService.getVentas(desde, hasta)
            if (!response.isSuccessful) {
                Log.w(TAG, "Error al descargar historial: ${response.code()}")
                return
            }
            val remoteVentas = response.body() ?: return
            var nuevas = 0

            remoteVentas.forEach { dto ->
                if (ventaDao.getByRemoteId(dto.id) != null) return@forEach

                // API returns wall-clock time with Z appended — strip it to get local string
                val fechaHoraLocal = dto.fechaHora.removeSuffix("Z")

                val localId = ventaDao.insertVenta(
                    VentaEntity(
                        remoteId = dto.id,
                        nombreCliente = dto.nombreCliente,
                        montoTotal = dto.montoTotal,
                        fechaHora = fechaHoraLocal,
                        usuarioId = 0L,
                        sincronizado = true,
                    )
                )
                ventaDao.insertDetalles(
                    dto.items.map { item ->
                        VentaDetalleEntity(
                            ventaLocalId = localId,
                            productoId = item.productoId,
                            detalle = item.detalle,
                            cantidad = item.cantidad,
                            precioUnitario = item.precioUnitario,
                            total = item.total,
                        )
                    }
                )
                nuevas++
            }
            Log.d(TAG, "Historial descargado: $nuevas ventas nuevas (desde=$desde hasta=$hasta)")
        } catch (e: Exception) {
            Log.w(TAG, "Error al descargar historial: ${e.message}")
        }
    }
}
