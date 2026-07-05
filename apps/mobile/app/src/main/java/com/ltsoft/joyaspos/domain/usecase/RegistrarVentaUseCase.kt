package com.ltsoft.joyaspos.domain.usecase

import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import javax.inject.Inject

class RegistrarVentaUseCase @Inject constructor(
    private val ventaRepository: VentaRepository
) {
    suspend operator fun invoke(venta: VentaEntity, items: List<VentaDetalleEntity>): Long =
        ventaRepository.registrarVenta(venta, items)
}
