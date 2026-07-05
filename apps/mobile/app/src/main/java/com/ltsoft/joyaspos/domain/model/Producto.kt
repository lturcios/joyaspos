package com.ltsoft.joyaspos.domain.model

data class Producto(
    val id: Int,
    val nombre: String,
    val unidadMedida: String,
    val existencia: Double,
    val activo: Boolean,
)
