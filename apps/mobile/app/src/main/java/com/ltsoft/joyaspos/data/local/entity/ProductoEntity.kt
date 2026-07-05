package com.ltsoft.joyaspos.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

// Full fields implemented in SKILL-11 (room-database)
@Entity(tableName = "productos")
data class ProductoEntity(
    @PrimaryKey val id: Int = 0,
    val nombre: String = "",
    val unidadMedida: String = "",
    val existencia: Double = 0.0,
    val activo: Boolean = true,
    val ultimaSync: Long = 0L,
)
