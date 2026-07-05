package com.ltsoft.joyaspos.data.remote.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ProductoDto(
    val id: Long,
    val nombre: String,
    val unidad_medida: String,
    val existencia: Double,
    val activo: Boolean,
)
