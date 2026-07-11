package com.ltsoft.joyaspos.presentation.confirmation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class ConfirmationViewModel @Inject constructor(
    private val ventaRepository: VentaRepository,
    private val sessionPreferences: SessionPreferences,
    private val printHelper: SunmiPrintHelper,
) : ViewModel() {

    private val _venta = MutableStateFlow<VentaEntity?>(null)
    val venta: StateFlow<VentaEntity?> = _venta.asStateFlow()

    private val _printError = MutableStateFlow<String?>(null)
    val printError: StateFlow<String?> = _printError.asStateFlow()

    private val _printSuccess = MutableStateFlow(false)
    val printSuccess: StateFlow<Boolean> = _printSuccess.asStateFlow()

    fun loadVenta(localId: Long) {
        viewModelScope.launch {
            _venta.value = ventaRepository.getVentaById(localId)
        }
    }

    fun imprimirRecibo(venta: VentaEntity) {
        _printSuccess.value = false
        viewModelScope.launch {
            if (!printHelper.awaitConnected()) {
                _printError.value = "Impresora no disponible o sin papel instalado."
                return@launch
            }
            val items = ventaRepository.getDetallesByVentaId(venta.id)
            val session = sessionPreferences.getSessionData().firstOrNull()
            val username = session?.username ?: ""
            val sucursalNombre = session?.sucursalNombre ?: ""

            val ventaId = if (venta.remoteId != null) "#R-${venta.remoteId}"
                          else "#L-${venta.id}"

            val receiptData = ReceiptData(
                ventaId = ventaId,
                fecha = formatDateTime(venta.fechaHora),
                cliente = venta.nombreCliente,
                vendedor = username,
                sucursalNombre = sucursalNombre,
                items = items.map { item ->
                    ReceiptItem(
                        detalle = item.detalle,
                        cantidad = item.cantidad,
                        precioUnitario = item.precioUnitario,
                        total = item.total,
                    )
                },
                montoTotal = venta.montoTotal,
            )

            printHelper.printReceipt(
                data = receiptData,
                onSuccess = {
                    _printError.value = null
                    _printSuccess.value = true
                },
                onError = { msg -> _printError.value = msg },
            )
        }
    }

    fun clearPrintError() {
        _printError.value = null
    }

    private fun formatDateTime(iso: String): String {
        val fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
        return try {
            fmt.format(LocalDateTime.parse(iso))
        } catch (e: Exception) {
            try {
                fmt.format(Instant.parse(iso).atZone(ZoneId.of("America/El_Salvador")))
            } catch (e2: Exception) {
                iso
            }
        }
    }
}
