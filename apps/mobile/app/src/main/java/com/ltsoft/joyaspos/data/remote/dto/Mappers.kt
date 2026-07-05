package com.ltsoft.joyaspos.data.remote.dto

import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity

fun VentaEntity.toCreateVentaRequest(items: List<VentaDetalleEntity>): CreateVentaRequest {
    return CreateVentaRequest(
        nombreCliente = nombreCliente,
        fechaHora = fechaHora,
        items = items.map { item ->
            VentaItemRequest(
                productoId = item.productoId,
                cantidad = item.cantidad,
                precioUnitario = item.precioUnitario,
                detalleAdicional = item.detalleAdicional,
            )
        }
    )
}
