package com.ltsoft.joyaspos.presentation.sales

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Print
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.presentation.components.LoadingState
import com.ltsoft.joyaspos.presentation.components.SyncStatusChip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaleDetailScreen(
    localId: Long,
    onBack: () -> Unit,
    viewModel: SaleDetailViewModel = hiltViewModel(),
) {
    val venta by viewModel.venta.collectAsStateWithLifecycle()
    val detalles by viewModel.detalles.collectAsStateWithLifecycle()
    val printError by viewModel.printError.collectAsStateWithLifecycle()

    LaunchedEffect(localId) { viewModel.loadVenta(localId) }

    printError?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.clearPrintError() },
            title = { Text("Error de impresora") },
            text = { Text(error) },
            confirmButton = {
                Button(
                    onClick = { viewModel.reimprimirRecibo() },
                    modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                ) {
                    Text("Reintentar")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.clearPrintError() }) {
                    Text("Omitir")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle de venta", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.reimprimirRecibo() }) {
                        Icon(Icons.Default.Print, contentDescription = "Reimprimir recibo")
                    }
                }
            )
        }
    ) { padding ->
        if (venta == null) {
            LoadingState(modifier = Modifier.padding(padding))
            return@Scaffold
        }

        val v = venta!!
        val ventaId = if (v.remoteId != null) "#R-${v.remoteId}" else "#L-${v.id}"

        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(ventaId, style = MaterialTheme.typography.titleLarge)
                            SyncStatusChip(sincronizado = v.sincronizado)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Cliente: ${v.nombreCliente}",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        Text(
                            "Fecha: ${v.fechaHora.take(16).replace("T", " ")}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Total: $${"%.2f".format(v.montoTotal)}",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }

            item {
                Text("Detalle de productos", style = MaterialTheme.typography.titleMedium)
                HorizontalDivider(modifier = Modifier.padding(top = 4.dp))
            }

            items(detalles) { item ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = item.detalle,
                                style = MaterialTheme.typography.bodyLarge,
                            )
                            Text(
                                text = "${item.cantidad} × $${"%.2f".format(item.precioUnitario)}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            text = "$${"%.2f".format(item.total)}",
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                }
            }
        }
    }
}
