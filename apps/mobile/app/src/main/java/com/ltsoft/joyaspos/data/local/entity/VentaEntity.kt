package com.ltsoft.joyaspos.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ventas")
data class VentaEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val remoteId: Long? = null,
    val nombreCliente: String = "Clientes Varios",
    val montoTotal: Double = 0.0,
    val fechaHora: String = "",
    val usuarioId: Long = 0L,
    val sincronizado: Boolean = false,
)
