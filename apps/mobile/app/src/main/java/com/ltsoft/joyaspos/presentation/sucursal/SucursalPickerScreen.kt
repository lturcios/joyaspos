package com.ltsoft.joyaspos.presentation.sucursal

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.data.remote.dto.SucursalDto
import com.ltsoft.joyaspos.presentation.components.LoadingState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SucursalPickerScreen(
    onSucursalSelected: () -> Unit,
    viewModel: SucursalPickerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        if (uiState is SucursalPickerUiState.Done) onSucursalSelected()
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Selecciona una sucursal") })
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            when (val state = uiState) {
                is SucursalPickerUiState.Loading -> LoadingState()
                is SucursalPickerUiState.Error -> Text(
                    text = state.message,
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.error,
                )
                is SucursalPickerUiState.BlockedBySyncPending -> AlertDialog(
                    onDismissRequest = { /* non-dismissable until user acknowledges */ },
                    title = { Text("Ventas pendientes") },
                    text = {
                        Text(
                            "Hay ${state.count} venta(s) sin sincronizar de otra sucursal. " +
                            "Conecta a internet y sincroniza antes de cambiar de sucursal."
                        )
                    },
                    confirmButton = {
                        TextButton(onClick = { viewModel.loadSucursales() }) {
                            Text("Entendido")
                        }
                    },
                )
                is SucursalPickerUiState.Ready -> LazyColumn {
                    items(state.sucursales, key = { it.id }) { sucursal ->
                        SucursalItem(
                            sucursal = sucursal,
                            onClick = { viewModel.seleccionarSucursal(sucursal) },
                        )
                    }
                }
                is SucursalPickerUiState.Done -> LoadingState()
            }
        }
    }
}

@Composable
private fun SucursalItem(sucursal: SucursalDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable(onClick = onClick),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = sucursal.nombre,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            sucursal.direccion?.let {
                Text(text = it, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
