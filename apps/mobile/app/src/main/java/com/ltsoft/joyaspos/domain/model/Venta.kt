package com.ltsoft.joyaspos.domain.model

data class Venta(
    val localId: Long = 0,
    val remoteId: Int? = null,
    val nombreCliente: String,
    val montoTotal: Double,
    val fechaHora: String,
    val usuarioId: Int,
    val sincronizado: Boolean = false,
    val items: List<VentaItem> = emptyList(),
)
