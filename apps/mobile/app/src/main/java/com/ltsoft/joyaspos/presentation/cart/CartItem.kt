package com.ltsoft.joyaspos.presentation.cart

data class CartItem(
    val productoId: Long,
    val nombreProducto: String,
    val detalleAdicional: String,
    val cantidad: Double,
    val precioUnitario: Double,
) {
    val detalle: String get() = "$nombreProducto $detalleAdicional".trim()
    val subtotal: Double get() = cantidad * precioUnitario
}
