package com.ltsoft.joyaspos.data.local.dao

import androidx.room.*
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VentaDao {

    @Query("SELECT * FROM ventas WHERE sincronizado = 0 ORDER BY fechaHora ASC")
    fun getPendientes(): Flow<List<VentaEntity>>

    @Query("SELECT * FROM ventas WHERE sincronizado = 0 ORDER BY fechaHora ASC")
    suspend fun getPendientesList(): List<VentaEntity>

    @Query("""
        SELECT * FROM ventas
        WHERE fechaHora >= :desde AND fechaHora <= :hasta
        ORDER BY fechaHora DESC
    """)
    fun getPorPeriodo(desde: String, hasta: String): Flow<List<VentaEntity>>

    @Query("SELECT COUNT(*) FROM ventas WHERE sincronizado = 0")
    fun countPendientes(): Flow<Int>

    @Query("SELECT * FROM ventas WHERE id = :id")
    suspend fun getById(id: Long): VentaEntity?

    @Query("SELECT * FROM ventas WHERE remoteId = :remoteId LIMIT 1")
    suspend fun getByRemoteId(remoteId: Long): VentaEntity?

    @Query("SELECT * FROM venta_detalle WHERE ventaLocalId = :ventaLocalId")
    suspend fun getDetallesByVentaId(ventaLocalId: Long): List<VentaDetalleEntity>

    @Insert
    suspend fun insertVenta(venta: VentaEntity): Long

    @Insert
    suspend fun insertDetalles(detalles: List<VentaDetalleEntity>)

    @Query("""
        UPDATE ventas
        SET sincronizado = 1, remoteId = :remoteId
        WHERE id = :localId
    """)
    suspend fun marcarSincronizado(localId: Long, remoteId: Long)

    @Update
    suspend fun update(venta: VentaEntity)
}
