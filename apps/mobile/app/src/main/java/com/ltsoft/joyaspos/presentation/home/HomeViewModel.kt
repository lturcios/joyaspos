package com.ltsoft.joyaspos.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import com.ltsoft.joyaspos.domain.repository.ProductoRepository
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(
        val productos: List<ProductoEntity>,
        val filteredProductos: List<ProductoEntity>,
        val searchQuery: String,
    ) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val productoRepository: ProductoRepository,
    private val ventaRepository: VentaRepository,
    private val sessionPreferences: SessionPreferences,
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val uiState: StateFlow<HomeUiState> = productoRepository
        .getProductos()
        .combine<List<ProductoEntity>, String, HomeUiState>(_searchQuery) { productos, query ->
            val filtered = if (query.isBlank()) productos
            else productos.filter { it.nombre.contains(query, ignoreCase = true) }
            HomeUiState.Success(productos, filtered, query)
        }
        .catch { e -> emit(HomeUiState.Error(e.message ?: "Error al cargar productos")) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = HomeUiState.Loading,
        )

    val pendingCount: StateFlow<Int> = ventaRepository
        .countPendientes()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    val username: StateFlow<String> = sessionPreferences
        .getUsername()
        .map { it ?: "" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun refreshProductos() {
        viewModelScope.launch {
            productoRepository.syncProductos(force = false)
        }
    }

    fun forceRefreshProductos() {
        viewModelScope.launch {
            productoRepository.syncProductos(force = true)
        }
    }

    fun syncHistorial() {
        viewModelScope.launch {
            ventaRepository.descargarHistorial()
        }
    }

    fun sincronizarPendientes() {
        viewModelScope.launch {
            ventaRepository.sincronizarPendientes()
        }
    }

    fun logout() {
        ventaRepository.resetHistorialFlag()
        productoRepository.resetSyncFlag()
        viewModelScope.launch {
            sessionPreferences.clearSession()
        }
    }
}
