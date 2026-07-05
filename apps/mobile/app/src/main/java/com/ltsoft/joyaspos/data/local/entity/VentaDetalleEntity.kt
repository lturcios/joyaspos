package com.ltsoft.joyaspos.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "venta_detalle",
    foreignKeys = [
        ForeignKey(
            entity = VentaEntity::class,
            parentColumns = ["id"],
            childColumns = ["ventaLocalId"],
            onDelete = ForeignKey.CASCADE,
        )
    ],
    indices = [Index("ventaLocalId")]
)
data class VentaDetalleEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val ventaLocalId: Long,
    val productoId: Long,
    val detalle: String,
    val detalleAdicional: String? = null,
    val cantidad: Double,
    val precioUnitario: Double,
    val total: Double,
)
