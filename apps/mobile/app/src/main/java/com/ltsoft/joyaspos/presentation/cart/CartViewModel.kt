package com.ltsoft.joyaspos.presentation.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.ZoneId
import javax.inject.Inject

sealed class CartUiState {
    object Idle : CartUiState()
    object Submitting : CartUiState()
    data class Confirmed(val localId: Long) : CartUiState()
    data class Error(val message: String) : CartUiState()
}

@HiltViewModel
class CartViewModel @Inject constructor(
    private val ventaRepository: VentaRepository,
    private val sessionPreferences: SessionPreferences,
) : ViewModel() {

    private val _items = MutableStateFlow<List<CartItem>>(emptyList())
    val items: StateFlow<List<CartItem>> = _items.asStateFlow()

    private val _nombreCliente = MutableStateFlow("")
    val nombreCliente: StateFlow<String> = _nombreCliente.asStateFlow()

    private val _uiState = MutableStateFlow<CartUiState>(CartUiState.Idle)
    val uiState: StateFlow<CartUiState> = _uiState.asStateFlow()

    val totalMonto: StateFlow<Double> = _items
        .map { items -> items.sumOf { it.subtotal } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0.0)

    val itemCount: StateFlow<Int> = _items
        .map { it.size }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    fun addItem(item: CartItem) {
        _items.update { current -> current + item }
    }

    fun removeItem(index: Int) {
        _items.update { current -> current.toMutableList().also { it.removeAt(index) } }
    }

    fun onNombreClienteChange(value: String) {
        _nombreCliente.value = value
    }

    fun confirmarVenta() {
        val currentItems = _items.value
        if (currentItems.isEmpty()) return

        viewModelScope.launch {
            _uiState.value = CartUiState.Submitting
            val session = sessionPreferences.getSessionData().firstOrNull() ?: return@launch
            val userId = session.userId
            // Admin passes their selected sucursal_id; vendedor derives it from JWT server-side
            val sucursalIdParaApi: Long? = if (session.isAdmin) session.sucursalId else null
            val fechaHora = LocalDateTime.now(ZoneId.of("America/El_Salvador")).toString()
            val cliente = _nombreCliente.value.trim().ifBlank { "Clientes Varios" }

            val venta = VentaEntity(
                nombreCliente = cliente,
                montoTotal = totalMonto.value,
                fechaHora = fechaHora,
                usuarioId = userId,
                sincronizado = false,
            )
            val detalles = currentItems.map { item ->
                VentaDetalleEntity(
                    ventaLocalId = 0L,
                    productoId = item.productoId,
                    detalle = item.detalle,
                    detalleAdicional = item.detalleAdicional.ifBlank { null },
                    cantidad = item.cantidad,
                    precioUnitario = item.precioUnitario,
                    total = item.subtotal,
                )
            }

            val localId = ventaRepository.registrarVenta(venta, detalles, sucursalIdParaApi)
            // Clear cart only after successful Room insert
            _items.value = emptyList()
            _nombreCliente.value = ""
            _uiState.value = CartUiState.Confirmed(localId)
        }
    }

    fun resetState() {
        _uiState.value = CartUiState.Idle
    }
}
