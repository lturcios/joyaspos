package com.ltsoft.joyaspos.presentation.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject

sealed class SalesQueryUiState {
    object Loading : SalesQueryUiState()
    data class Success(val ventas: List<VentaEntity>, val total: Double) : SalesQueryUiState()
    object Empty : SalesQueryUiState()
    data class Error(val message: String) : SalesQueryUiState()
}

@HiltViewModel
class SalesQueryViewModel @Inject constructor(
    private val ventaRepository: VentaRepository,
) : ViewModel() {

    private val _selectedPeriodo = MutableStateFlow("hoy")
    val selectedPeriodo: StateFlow<String> = _selectedPeriodo.asStateFlow()

    private val _uiState = MutableStateFlow<SalesQueryUiState>(SalesQueryUiState.Loading)
    val uiState: StateFlow<SalesQueryUiState> = _uiState.asStateFlow()

    private val _selectedVentaDetalle = MutableStateFlow<List<VentaDetalleEntity>>(emptyList())
    val selectedVentaDetalle: StateFlow<List<VentaDetalleEntity>> = _selectedVentaDetalle

    init {
        loadVentas("hoy")
    }

    fun onPeriodoSelected(key: String) {
        _selectedPeriodo.value = key
        loadVentas(key)
    }

    fun loadVentaDetalle(ventaLocalId: Long) {
        viewModelScope.launch {
            _selectedVentaDetalle.value = ventaRepository.getDetallesByVentaId(ventaLocalId)
        }
    }

    private fun loadVentas(periodoKey: String) {
        viewModelScope.launch {
            val (desde, hasta) = calcularRango(periodoKey)
            ventaRepository.getVentasPorPeriodo(desde, hasta)
                .catch { e ->
                    _uiState.value = SalesQueryUiState.Error(e.message ?: "Error al cargar ventas")
                }
                .collect { ventas ->
                    _uiState.value = when {
                        ventas.isEmpty() -> SalesQueryUiState.Empty
                        else -> SalesQueryUiState.Success(
                            ventas = ventas,
                            total = ventas.sumOf { it.montoTotal },
                        )
                    }
                }
        }
    }

    private fun calcularRango(key: String): Pair<String, String> {
        val hoy = LocalDate.now(ZoneId.of("America/El_Salvador"))

        fun LocalDate.start() = "${this}T00:00:00"
        fun LocalDate.end() = "${this}T23:59:59.999999999"

        return when (key) {
            "hoy" -> hoy.start() to hoy.end()
            "esta_semana" -> hoy.with(DayOfWeek.MONDAY).start() to hoy.end()
            "esta_quincena" -> if (hoy.dayOfMonth <= 15) {
                hoy.withDayOfMonth(1).start() to hoy.withDayOfMonth(15).end()
            } else {
                hoy.withDayOfMonth(16).start() to hoy.withDayOfMonth(hoy.lengthOfMonth()).end()
            }
            "este_mes" -> hoy.withDayOfMonth(1).start() to hoy.withDayOfMonth(hoy.lengthOfMonth()).end()
            else -> hoy.start() to hoy.end()
        }
    }
}
