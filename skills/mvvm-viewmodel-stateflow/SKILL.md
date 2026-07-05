---
name: mvvm-viewmodel-stateflow
description: |
  Implementa el patrón MVVM con StateFlow en Jetpack Compose para la app Android
  de JoyasPOS: sealed class UiState por pantalla, emisión desde ViewModel con
  StateFlow, colección reactiva en Composables con collectAsStateWithLifecycle(),
  separación estricta lógica/presentación, y ejemplos completos de los ViewModels
  del proyecto (HomeViewModel, CartViewModel, SalesQueryViewModel). Usar al crear
  un ViewModel nuevo, al agregar un estado de UI complejo, al depurar por qué
  la UI no reacciona a cambios de estado, o como referencia del patrón correcto
  para este proyecto.
  Depende de SKILL-10 (android-project-structure), SKILL-12 (repository),
  SKILL-15 (navigation) y SKILL-17 (hilt).
---

# SKILL-20 — MVVM + ViewModel + StateFlow (apps/mobile)

## Principio
```
Composable        — observa StateFlow; llama funciones del ViewModel
    │
    ▼ (llama)
ViewModel         — contiene lógica; emite UiState; NO toca UI
    │
    ▼ (usa)
Repository        — coordina Room + API
```
**Regla absoluta:** ningún Composable contiene lógica de negocio. Ningún ViewModel
toca Room ni Retrofit directamente.

---

## 1. Patrón UiState sealed class

Cada pantalla tiene su propio sealed class con los estados posibles:

```kotlin
// Patrón base — adaptar por pantalla
sealed class XxxUiState {
    object Loading : XxxUiState()
    data class Success(val data: TipoDeDato) : XxxUiState()
    data class Error(val message: String) : XxxUiState()
    object Empty : XxxUiState()
}
```

---

## 2. HomeViewModel

```kotlin
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

    /** Estado principal de la pantalla */
    val uiState: StateFlow<HomeUiState> = productoRepository
        .getProductos()
        .combine(_searchQuery) { productos, query ->
            val filtered = if (query.isBlank()) productos
            else productos.filter { it.nombre.contains(query, ignoreCase = true) }

            if (filtered.isEmpty() && productos.isNotEmpty()) {
                HomeUiState.Success(productos, emptyList(), query)
            } else {
                HomeUiState.Success(productos, filtered, query)
            }
        }
        .catch { e ->
            emit(HomeUiState.Error(e.message ?: "Error al cargar productos"))
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = HomeUiState.Loading,
        )

    /** Conteo de ventas pendientes de sync (para el banner) */
    val pendingCount: StateFlow<Int> = ventaRepository
        .countPendientes()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    /** Nombre del usuario logueado (para el toolbar) */
    val username: StateFlow<String> = sessionPreferences
        .getUsername()
        .map { it ?: "" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    /** Refrescar productos desde la API al entrar a la pantalla */
    fun refreshProductos() {
        viewModelScope.launch {
            productoRepository.syncProductos()
        }
    }

    fun logout() {
        viewModelScope.launch {
            sessionPreferences.clearSession()
        }
    }
}
```

---

## 3. CartViewModel

```kotlin
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
import java.time.Instant
import java.time.format.DateTimeFormatter
import javax.inject.Inject

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

            val userId = sessionPreferences.getUserId().firstOrNull() ?: return@launch
            val fechaHora = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
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
                    ventaLocalId = 0L,  // se asigna en el repository tras insert
                    productoId = item.productoId,
                    detalle = item.detalle,
                    detalleAdicional = item.detalleAdicional.ifBlank { null },
                    cantidad = item.cantidad,
                    precioUnitario = item.precioUnitario,
                    total = item.subtotal,
                )
            }

            val localId = ventaRepository.registrarVenta(venta, detalles)

            // Limpiar carrito tras registro exitoso en Room
            _items.value = emptyList()
            _nombreCliente.value = ""
            _uiState.value = CartUiState.Confirmed(localId)
        }
    }

    fun resetState() {
        _uiState.value = CartUiState.Idle
    }
}
```

---

## 4. SalesQueryViewModel

```kotlin
package com.ltsoft.joyaspos.presentation.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.entity.VentaDetalleEntity
import com.ltsoft.joyaspos.data.local.entity.VentaEntity
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
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

    private var _selectedVentaDetalle = MutableStateFlow<List<VentaDetalleEntity>>(emptyList())
    val selectedVentaDetalle: StateFlow<List<VentaDetalleEntity>> = _selectedVentaDetalle

    init { loadVentas("hoy") }

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

    /**
     * Calcula el rango de fechas para cada atajo de período.
     * Retorna par (desde, hasta) en formato "YYYY-MM-DDTHH:mm:ss".
     */
    private fun calcularRango(key: String): Pair<String, String> {
        val hoy = LocalDate.now()
        val fmt = DateTimeFormatter.ISO_LOCAL_DATE

        return when (key) {
            "hoy" ->
                "${hoy.format(fmt)}T00:00:00" to "${hoy.format(fmt)}T23:59:59"

            "esta_semana" -> {
                val lunes = hoy.with(java.time.DayOfWeek.MONDAY)
                "${lunes.format(fmt)}T00:00:00" to "${hoy.format(fmt)}T23:59:59"
            }

            "esta_quincena" -> {
                if (hoy.dayOfMonth <= 15) {
                    val inicio = hoy.withDayOfMonth(1)
                    val fin = hoy.withDayOfMonth(15)
                    "${inicio.format(fmt)}T00:00:00" to "${fin.format(fmt)}T23:59:59"
                } else {
                    val inicio = hoy.withDayOfMonth(16)
                    val fin = hoy.withDayOfMonth(hoy.lengthOfMonth())
                    "${inicio.format(fmt)}T00:00:00" to "${fin.format(fmt)}T23:59:59"
                }
            }

            "este_mes" -> {
                val inicio = hoy.withDayOfMonth(1)
                val fin = hoy.withDayOfMonth(hoy.lengthOfMonth())
                "${inicio.format(fmt)}T00:00:00" to "${fin.format(fmt)}T23:59:59"
            }

            else -> "${hoy.format(fmt)}T00:00:00" to "${hoy.format(fmt)}T23:59:59"
        }
    }
}
```

---

## 5. Colección en Composables

```kotlin
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel(),
    onNavigateToCart: () -> Unit,
    onNavigateToSalesQuery: () -> Unit,
    onLogout: () -> Unit,
) {
    // collectAsStateWithLifecycle detiene la colección cuando la UI no está visible
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pendingCount by viewModel.pendingCount.collectAsStateWithLifecycle()
    val username by viewModel.username.collectAsStateWithLifecycle()

    // Refrescar productos al entrar a la pantalla
    LaunchedEffect(Unit) { viewModel.refreshProductos() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("JoyasPOS — $username") },
                actions = {
                    IconButton(onClick = onLogout) { /* ícono logout */ }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            SyncStatusBanner(
                isOffline = false,  // obtener de ConnectivityManager
                pendingCount = pendingCount,
            )
            when (val state = uiState) {
                is HomeUiState.Loading -> LoadingState()
                is HomeUiState.Error -> ErrorState(
                    message = state.message,
                    onRetry = { viewModel.refreshProductos() }
                )
                is HomeUiState.Success -> {
                    if (state.filteredProductos.isEmpty()) {
                        EmptyState("Sin productos disponibles")
                    } else {
                        LazyColumn {
                            items(state.filteredProductos) { producto ->
                                ProductoCard(
                                    producto = producto,
                                    onAgregar = { /* abrir AddItemDialog */ }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
```

---

## 6. Reglas del patrón MVVM en este proyecto

1. **`when(uiState)`** siempre cubre todos los casos — sin `else` implícito.
2. **`SharingStarted.WhileSubscribed(5_000)`** en todos los `stateIn` — evita queries activos cuando la pantalla no está visible.
3. **`LaunchedEffect(Unit)`** para efectos de una sola vez al entrar a la pantalla.
4. **`collectAsStateWithLifecycle()`** siempre en lugar de `collectAsState()`** — consciente del ciclo de vida.
5. **Nunca `_mutableState.value = ...` desde un Composable** — solo desde el ViewModel.
6. **Los SharedFlow de eventos de navegación** usan `extraBufferCapacity = 1` para no perder eventos.
