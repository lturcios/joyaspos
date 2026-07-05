package com.ltsoft.joyaspos.presentation.cart

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.presentation.components.BottomTab
import com.ltsoft.joyaspos.presentation.components.EmptyState
import com.ltsoft.joyaspos.presentation.components.JoyasBottomBar
import com.ltsoft.joyaspos.ui.theme.SlateBackground
import com.ltsoft.joyaspos.ui.theme.SlateIcon
import com.ltsoft.joyaspos.ui.theme.SurfaceWhite
import com.ltsoft.joyaspos.ui.theme.UnitBadgeText

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    cartViewModel: CartViewModel,
    onVentaConfirmada: (Long) -> Unit,
    onBack: () -> Unit,
    onNavigateToHome: () -> Unit = {},
    onNavigateToSalesQuery: () -> Unit = {},
) {
    val items by cartViewModel.items.collectAsStateWithLifecycle()
    val nombreCliente by cartViewModel.nombreCliente.collectAsStateWithLifecycle()
    val totalMonto by cartViewModel.totalMonto.collectAsStateWithLifecycle()
    val uiState by cartViewModel.uiState.collectAsStateWithLifecycle()

    var showMenu by remember { mutableStateOf(false) }

    LaunchedEffect(uiState) {
        if (uiState is CartUiState.Confirmed) {
            onVentaConfirmada((uiState as CartUiState.Confirmed).localId)
            cartViewModel.resetState()
        }
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = "JoyasPOS",
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
                                text = { Text("Ir al inventario") },
                                onClick = {
                                    showMenu = false
                                    onNavigateToHome()
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.ShoppingCart, contentDescription = null)
                                },
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.Default.ShoppingCart,
                            contentDescription = "Carrito",
                            tint = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = SurfaceWhite,
                ),
            )
        },
        bottomBar = {
            JoyasBottomBar(
                activeTab = null,
                pendingCount = 0,
                onInventario = onNavigateToHome,
                onVentas = onNavigateToSalesQuery,
                onSincronizar = { },
                onAjustes = { },
            )
        },
    ) { padding ->
        if (items.isEmpty()) {
            EmptyState(
                message = "El carrito está vacío",
                modifier = Modifier
                    .padding(padding)
                    .background(SlateBackground),
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .padding(padding)
                    .background(SlateBackground),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // Section header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Carrito de Venta",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "${items.size} artículos",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                // Item cards
                itemsIndexed(items) { index, item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            // Icon placeholder
                            Box(
                                modifier = Modifier
                                    .size(60.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(SlateBackground),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = SlateIcon,
                                    modifier = Modifier.size(28.dp),
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.detalle,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    text = "${item.cantidad.let { if (it % 1.0 == 0.0) it.toInt().toString() else it.toString() }} × $${"%.2f".format(item.precioUnitario)}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            IconButton(onClick = { cartViewModel.removeItem(index) }) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Eliminar",
                                    tint = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                    }
                }

                // Client name card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = "NOMBRE DEL CLIENTE",
                                style = MaterialTheme.typography.labelSmall,
                                color = UnitBadgeText,
                                fontWeight = FontWeight.Bold,
                            )
                            OutlinedTextField(
                                value = nombreCliente,
                                onValueChange = cartViewModel::onNombreClienteChange,
                                placeholder = { Text("Clientes Varios") },
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null)
                                },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                textStyle = MaterialTheme.typography.bodyLarge,
                            )
                        }
                    }
                }

                // Summary card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    text = "Subtotal",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    text = "$${"%.2f".format(totalMonto)}",
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = "Total",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    text = "$${"%.2f".format(totalMonto)}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }

                // Confirm button
                item {
                    Button(
                        onClick = cartViewModel::confirmarVenta,
                        enabled = uiState !is CartUiState.Submitting,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF111827),
                            contentColor = Color.White,
                        ),
                    ) {
                        if (uiState is CartUiState.Submitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                text = "Confirmar Venta",
                                style = MaterialTheme.typography.labelLarge,
                            )
                        }
                    }
                }

                item { Spacer(Modifier.height(8.dp)) }
            }
        }
    }
}
