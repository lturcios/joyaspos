package com.ltsoft.joyaspos.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class VentaItemRequest(
    @Json(name = "producto_id") val productoId: Long,
    val cantidad: Double,
    @Json(name = "precio_unitario") val precioUnitario: Double,
    @Json(name = "detalle_adicional") val detalleAdicional: String? = null,
)

@JsonClass(generateAdapter = true)
data class CreateVentaRequest(
    @Json(name = "nombre_cliente") val nombreCliente: String?,
    @Json(name = "fecha_hora") val fechaHora: String?,
    val items: List<VentaItemRequest>,
    @Json(name = "sucursal_id") val sucursalId: Long? = null,
)

@JsonClass(generateAdapter = true)
data class VentaSyncPayload(
    @Json(name = "local_id") val localId: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String?,
    @Json(name = "fecha_hora") val fechaHora: String?,
    val items: List<VentaItemRequest>,
    @Json(name = "sucursal_id") val sucursalId: Long? = null,
)

@JsonClass(generateAdapter = true)
data class SyncVentasRequest(val ventas: List<VentaSyncPayload>)

@JsonClass(generateAdapter = true)
data class VentaResponse(
    val id: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String,
    @Json(name = "monto_total") val montoTotal: Double,
    @Json(name = "fecha_hora") val fechaHora: String,
)

@JsonClass(generateAdapter = true)
data class VentaResumenDto(
    val id: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String,
    @Json(name = "monto_total") val montoTotal: Double,
    @Json(name = "fecha_hora") val fechaHora: String,
    val vendedor: String,
    val items: List<VentaDetalleItemDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class VentaDetalleItemDto(
    val id: Long,
    @Json(name = "producto_id") val productoId: Long,
    val detalle: String,
    val cantidad: Double,
    @Json(name = "precio_unitario") val precioUnitario: Double,
    val total: Double,
)

@JsonClass(generateAdapter = true)
data class VentaDetalleDto(
    val id: Long,
    @Json(name = "nombre_cliente") val nombreCliente: String,
    @Json(name = "monto_total") val montoTotal: Double,
    @Json(name = "fecha_hora") val fechaHora: String,
    val vendedor: String,
    val items: List<VentaDetalleItemDto>,
)

@JsonClass(generateAdapter = true)
data class SyncResultItem(
    val local_id: Long,
    val remote_id: Long,
)

@JsonClass(generateAdapter = true)
data class SyncErrorItem(
    val local_id: Long,
    val mensaje: String,
)

@JsonClass(generateAdapter = true)
data class SyncVentasResponse(
    val sincronizadas: List<SyncResultItem>,
    val errores: List<SyncErrorItem>,
)
