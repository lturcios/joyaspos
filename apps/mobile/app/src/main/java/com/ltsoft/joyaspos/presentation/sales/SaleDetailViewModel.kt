package com.ltsoft.joyaspos.presentation.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import com.ltsoft.joyaspos.print.ReceiptData
import com.ltsoft.joyaspos.print.ReceiptItem
import com.ltsoft.joyaspos.print.SunmiPrintHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class SaleDetailViewModel @Inject constructor(
    private val ventaRepository: VentaRepository,
    private val sessionPreferences: SessionPreferences,
    private val printHelper: SunmiPrintHelper,
) : ViewModel() {

    private val _venta = MutableStateFlow<VentaEntity?>(null)
    val venta: StateFlow<VentaEntity?> = _venta.asStateFlow()

    private val _detalles = MutableStateFlow<List<VentaDetalleEntity>>(emptyList())
    val detalles: StateFlow<List<VentaDetalleEntity>> = _detalles.asStateFlow()

    private val _printError = MutableStateFlow<String?>(null)
    val printError: StateFlow<String?> = _printError.asStateFlow()

    fun loadVenta(localId: Long) {
        viewModelScope.launch {
            _venta.value = ventaRepository.getVentaById(localId)
            _detalles.value = ventaRepository.getDetallesByVentaId(localId)
        }
    }

    fun reimprimirRecibo() {
        val currentVenta = _venta.value ?: return
        viewModelScope.launch {
            val username = sessionPreferences.getUsername().firstOrNull() ?: ""
            val ventaId = if (currentVenta.remoteId != null) "#R-${currentVenta.remoteId}"
                          else "#L-${currentVenta.id}"

            val receiptData = ReceiptData(
                ventaId = ventaId,
                fecha = formatDateTime(currentVenta.fechaHora),
                cliente = currentVenta.nombreCliente,
                vendedor = username,
                items = _detalles.value.map { item ->
                    ReceiptItem(
                        detalle = item.detalle,
                        cantidad = item.cantidad,
                        precioUnitario = item.precioUnitario,
                        total = item.total,
                    )
                },
                montoTotal = currentVenta.montoTotal,
            )
            printHelper.printReceipt(
                data = receiptData,
                onSuccess = { _printError.value = null },
                onError = { msg -> _printError.value = msg },
            )
        }
    }

    fun clearPrintError() {
        _printError.value = null
    }

    private fun formatDateTime(iso: String): String {
        return try {
            val instant = Instant.parse(iso)
            val local = ZoneId.of("America/El_Salvador").let { instant.atZone(it).toLocalDateTime() }
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(local)
        } catch (e: Exception) {
            iso
        }
    }
}
