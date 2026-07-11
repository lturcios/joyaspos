package com.ltsoft.joyaspos.presentation.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.presentation.cart.AddItemDialog
import com.ltsoft.joyaspos.presentation.cart.CartItem
import com.ltsoft.joyaspos.presentation.cart.CartViewModel
import com.ltsoft.joyaspos.presentation.components.*
import com.ltsoft.joyaspos.ui.theme.SlateBackground
import com.ltsoft.joyaspos.ui.theme.SurfaceWhite

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    cartViewModel: CartViewModel,
    onNavigateToCart: () -> Unit,
    onNavigateToSalesQuery: () -> Unit,
    onNavigateToCambiarSucursal: (() -> Unit)? = null,
    onLogout: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pendingCount by viewModel.pendingCount.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val itemCount by cartViewModel.itemCount.collectAsStateWithLifecycle()
    val username by viewModel.username.collectAsStateWithLifecycle()
    val sucursalNombre by viewModel.sucursalNombre.collectAsStateWithLifecycle()
    val isAdmin by viewModel.isAdmin.collectAsStateWithLifecycle()

    val titleText = if (sucursalNombre.isNotBlank()) "$sucursalNombre — $username" else username

    var selectedProducto by remember { mutableStateOf<ProductoEntity?>(null) }
    var showMenu by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.refreshProductos()
        viewModel.syncHistorial()
    }

    selectedProducto?.let { producto ->
        AddItemDialog(
            producto = producto,
            onConfirmar = { cantidad, precio, detalleAdicional ->
                cartViewModel.addItem(
                    CartItem(
                        productoId = producto.id.toLong(),
                        nombreProducto = producto.nombre,
                        detalleAdicional = detalleAdicional,
                        cantidad = cantidad,
                        precioUnitario = precio,
                    )
                )
                selectedProducto = null
            },
            onDismiss = { selectedProducto = null },
        )
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = if (titleText.isNotBlank()) titleText else "JoyasPOS",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menú")
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text("Historial de ventas") },
                                onClick = {
                                    showMenu = false
                                    onNavigateToSalesQuery()
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Receipt, contentDescription = null)
                                },
                            )
                            if (isAdmin && onNavigateToCambiarSucursal != null) {
                                DropdownMenuItem(
                                    text = { Text("Cambiar sucursal") },
                                    onClick = {
                                        showMenu = false
                                        onNavigateToCambiarSucursal()
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Default.LocationOn, contentDescription = null)
                                    },
                                )
                                HorizontalDivider()
                            }
                            DropdownMenuItem(
                                text = { Text("Cerrar sesión") },
                                onClick = {
                                    showMenu = false
                                    viewModel.logout()
                                    onLogout()
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Logout, contentDescription = null)
                                },
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.forceRefreshProductos() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualizar productos")
                    }
                    BadgedBox(
                        badge = {
                            if (itemCount > 0) Badge { Text("$itemCount") }
                        },
                    ) {
                        IconButton(onClick = onNavigateToCart) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "Ver carrito")
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = SurfaceWhite,
                ),
            )
        },
        bottomBar = {
            JoyasBottomBar(
                activeTab = BottomTab.INVENTARIO,
                pendingCount = pendingCount,
                onInventario = { /* already on inventario */ },
                onVentas = onNavigateToSalesQuery,
                onSincronizar = { viewModel.sincronizarPendientes() },
                onAjustes = { /* TODO: ajustes screen */ },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .background(SlateBackground),
        ) {
            SyncStatusBanner(isOffline = false, pendingCount = pendingCount)

            OutlinedTextField(
                value = searchQuery,
                onValueChange = viewModel::onSearchQueryChange,
                placeholder = { Text("Buscar productos...") },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true,
                shape = RoundedCornerShape(50.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                ),
            )

            when (val state = uiState) {
                is HomeUiState.Loading -> LoadingState()
                is HomeUiState.Error -> ErrorState(
                    message = state.message,
                    onRetry = { viewModel.refreshProductos() },
                )
                is HomeUiState.Success -> {
                    if (state.filteredProductos.isEmpty()) {
                        EmptyState(
                            if (state.searchQuery.isNotBlank())
                                "Sin resultados para \"${state.searchQuery}\""
                            else "Sin productos disponibles"
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(state.filteredProductos, key = { it.id }) { producto ->
                                ProductoCard(
                                    producto = producto,
                                    onAgregar = { selectedProducto = producto },
                                )
                            }
                            item { Spacer(Modifier.height(8.dp)) }
                        }
                    }
                }
            }
        }
    }
}
