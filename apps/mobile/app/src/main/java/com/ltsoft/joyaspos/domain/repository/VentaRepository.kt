package com.ltsoft.joyaspos.domain.repository

import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import kotlinx.coroutines.flow.Flow

interface VentaRepository {
    suspend fun registrarVenta(venta: VentaEntity, items: List<VentaDetalleEntity>): Long
    fun getVentasPorPeriodo(desde: String, hasta: String): Flow<List<VentaEntity>>
    fun countPendientes(): Flow<Int>
    suspend fun getPendientes(): List<VentaEntity>
    suspend fun getVentaById(localId: Long): VentaEntity?
    suspend fun getDetallesByVentaId(ventaLocalId: Long): List<VentaDetalleEntity>
    suspend fun marcarSincronizado(localId: Long, remoteId: Long)
    suspend fun descargarHistorial()
    fun resetHistorialFlag()
    suspend fun sincronizarPendientes()
    suspend fun uploadPendientes(): Boolean
}
