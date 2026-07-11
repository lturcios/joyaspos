package com.ltsoft.joyaspos.presentation.sucursal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import com.ltsoft.joyaspos.data.remote.dto.SucursalDto
import com.ltsoft.joyaspos.domain.repository.ProductoRepository
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class SucursalPickerUiState {
    object Loading : SucursalPickerUiState()
    data class Ready(val sucursales: List<SucursalDto>) : SucursalPickerUiState()
    data class Error(val message: String) : SucursalPickerUiState()
    data class BlockedBySyncPending(val count: Int) : SucursalPickerUiState()
    object Done : SucursalPickerUiState()
}

@HiltViewModel
class SucursalPickerViewModel @Inject constructor(
    private val sessionPreferences: SessionPreferences,
    private val ventaRepository: VentaRepository,
    private val productoRepository: ProductoRepository,
    private val moshi: Moshi,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SucursalPickerUiState>(SucursalPickerUiState.Loading)
    val uiState: StateFlow<SucursalPickerUiState> = _uiState.asStateFlow()

    init {
        loadSucursales()
    }

    fun loadSucursales() {
        viewModelScope.launch {
            _uiState.value = SucursalPickerUiState.Loading
            val json = sessionPreferences.getSucursalesJson().firstOrNull()
            if (json.isNullOrBlank()) {
                _uiState.value = SucursalPickerUiState.Error("No hay sucursales disponibles")
                return@launch
            }
            try {
                val adapter = moshi.adapter<List<SucursalDto>>(
                    Types.newParameterizedType(List::class.java, SucursalDto::class.java)
                )
                val sucursales = adapter.fromJson(json) ?: emptyList()
                _uiState.value = SucursalPickerUiState.Ready(sucursales)
            } catch (e: Exception) {
                _uiState.value = SucursalPickerUiState.Error("Error al cargar sucursales")
            }
        }
    }

    fun seleccionarSucursal(sucursal: SucursalDto) {
        viewModelScope.launch {
            // Check if there are pending sales from a different branch
            val prevSucursalId = sessionPreferences.getSucursalId().firstOrNull()
            if (prevSucursalId != null && prevSucursalId != sucursal.id) {
                val pendientes = ventaRepository.countPendientesOnce()
                if (pendientes > 0) {
                    _uiState.value = SucursalPickerUiState.BlockedBySyncPending(pendientes)
                    return@launch
                }
                // No pending sales — clear Room tables before switching branch
                ventaRepository.clearAllTables()
                productoRepository.resetSyncFlag()
            }
            // Persist the selected branch
            sessionPreferences.saveSucursalActiva(sucursal.id, sucursal.nombre)
            // Pre-sync products for the new branch
            productoRepository.syncProductos(force = true, sucursalId = sucursal.id)
            _uiState.value = SucursalPickerUiState.Done
        }
    }
}
