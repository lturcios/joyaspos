package com.ltsoft.joyaspos.presentation.sales

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.presentation.components.*
import com.ltsoft.joyaspos.presentation.components.BottomTab
import com.ltsoft.joyaspos.presentation.components.JoyasBottomBar
import com.ltsoft.joyaspos.ui.theme.DarkButtonColor
import com.ltsoft.joyaspos.ui.theme.SlateBackground
import com.ltsoft.joyaspos.ui.theme.WarningAmber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesQueryScreen(
    onNavigateToDetail: (Long) -> Unit,
    onBack: () -> Unit,
    onNavigateToHome: () -> Unit = {},
    viewModel: SalesQueryViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedPeriodo by viewModel.selectedPeriodo.collectAsStateWithLifecycle()
    val esAdmin by viewModel.esAdmin.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (esAdmin) "Historial de ventas" else "Ventas de hoy",
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        },
        bottomBar = {
            JoyasBottomBar(
                activeTab = BottomTab.VENTAS,
                pendingCount = 0,
                onInventario = onNavigateToHome,
                onVentas = { /* already on ventas */ },
                onSincronizar = { },
                onAjustes = { },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            if (esAdmin) {
                PeriodoSelector(
                    selectedKey = selectedPeriodo,
                    onPeriodoSelected = viewModel::onPeriodoSelected,
                )
            }

            when (val state = uiState) {
                is SalesQueryUiState.Loading -> LoadingState()
                is SalesQueryUiState.Empty -> EmptyState("Sin ventas en este período")
                is SalesQueryUiState.Error -> ErrorState(
                    message = state.message,
                    onRetry = { viewModel.onPeriodoSelected(selectedPeriodo) },
                )
                is SalesQueryUiState.Success -> {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkButtonColor),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 24.dp, vertical = 20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(horizontalAlignment = Alignment.Start) {
                                Text(
                                    text = "Ventas",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = Color.White.copy(alpha = 0.65f),
                                )
                                Text(
                                    text = "${state.ventas.size}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "Total en efectivo",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = Color.White.copy(alpha = 0.65f),
                                )
                                Text(
                                    text = "$${"%.2f".format(state.total)}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = WarningAmber,
                                )
                            }
                        }
                    }
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(state.ventas, key = { it.id }) { venta ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 72.dp)
                                    .clickable { onNavigateToDetail(venta.id) },
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = venta.nombreCliente,
                                            style = MaterialTheme.typography.titleMedium,
                                        )
                                        Text(
                                            text = venta.fechaHora.take(16).replace("T", " "),
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            text = "$${"%.2f".format(venta.montoTotal)}",
                                            style = MaterialTheme.typography.titleMedium,
                                        )
                                        SyncStatusChip(sincronizado = venta.sincronizado)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
