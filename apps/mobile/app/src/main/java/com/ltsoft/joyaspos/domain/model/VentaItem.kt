package com.ltsoft.joyaspos.domain.model

data class VentaItem(
    val productoId: Int,
    val detalle: String,
    val detalleAdicional: String? = null,
    val cantidad: Double,
    val precioUnitario: Double,
)
