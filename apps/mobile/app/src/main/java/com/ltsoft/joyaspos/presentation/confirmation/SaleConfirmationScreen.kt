package com.ltsoft.joyaspos.presentation.confirmation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.presentation.components.LoadingState
import com.ltsoft.joyaspos.ui.theme.ErrorRed
import com.ltsoft.joyaspos.ui.theme.SlateBackground
import com.ltsoft.joyaspos.ui.theme.SuccessGreen
import com.ltsoft.joyaspos.ui.theme.UnitBadgeText
import com.ltsoft.joyaspos.ui.theme.WarningAmber

@Composable
fun SaleConfirmationScreen(
    localId: Long,
    onNuevaVenta: () -> Unit,
    viewModel: ConfirmationViewModel = hiltViewModel(),
) {
    val venta by viewModel.venta.collectAsStateWithLifecycle()
    val printError by viewModel.printError.collectAsStateWithLifecycle()
    val printSuccess by viewModel.printSuccess.collectAsStateWithLifecycle()

    LaunchedEffect(localId) { viewModel.loadVenta(localId) }

    LaunchedEffect(venta) {
        venta?.let { viewModel.imprimirRecibo(it) }
    }

    if (venta == null) {
        LoadingState()
        return
    }

    val v = venta!!
    val ventaId = if (v.remoteId != null) "#R-${v.remoteId}" else "#L-${v.id}"

    // Derive print display state
    val isPrinting = !printSuccess && printError == null
    val hasPrintError = printError != null

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(top = 48.dp, bottom = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Success icon
        Box(
            modifier = Modifier
                .size(80.dp)
                .background(
                    color = Color(0xFFEFF6FF),
                    shape = RoundedCornerShape(16.dp),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = WarningAmber,
                modifier = Modifier.size(48.dp),
            )
        }

        Spacer(Modifier.height(24.dp))

        Text(
            text = "¡Venta Confirmada!",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "El pago ha sido procesado exitosamente.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(24.dp))

        // Venta details card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Column {
                        Text(
                            text = "TOTAL PAGADO",
                            style = MaterialTheme.typography.labelSmall,
                            color = UnitBadgeText,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "$${"%.2f".format(v.montoTotal)}",
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "REF",
                            style = MaterialTheme.typography.labelSmall,
                            color = UnitBadgeText,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = ventaId,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(
                        text = v.nombreCliente,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }

                Spacer(Modifier.height(8.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        imageVector = Icons.Default.ShoppingBag,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(
                        text = "...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Print status card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                when {
                    hasPrintError -> {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Default.Print,
                                contentDescription = null,
                                tint = ErrorRed,
                                modifier = Modifier.size(22.dp),
                            )
                            Text(
                                text = printError ?: "Error de impresora",
                                style = MaterialTheme.typography.bodyMedium,
                                color = ErrorRed,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        OutlinedButton(
                            onClick = {
                                viewModel.clearPrintError()
                                venta?.let { viewModel.imprimirRecibo(it) }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Reintentar impresión")
                        }
                    }
                    printSuccess -> {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Default.Print,
                                contentDescription = null,
                                tint = SuccessGreen,
                                modifier = Modifier.size(22.dp),
                            )
                            Text(
                                text = "Recibo impreso",
                                style = MaterialTheme.typography.bodyMedium,
                                color = SuccessGreen,
                            )
                        }
                    }
                    else -> { // isPrinting
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(
                                imageVector = Icons.Default.Print,
                                contentDescription = null,
                                tint = WarningAmber,
                                modifier = Modifier.size(22.dp),
                            )
                            Text(
                                text = "Imprimiendo recibo térmico...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = WarningAmber,
                            )
                        }
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = WarningAmber,
                            trackColor = Color(0xFFFEF3C7),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(32.dp))

        // Nueva Venta button
        Button(
            onClick = onNuevaVenta,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF111827),
                contentColor = Color.White,
            ),
        ) {
            Text(
                text = "Nueva Venta",
                style = MaterialTheme.typography.labelLarge,
            )
        }

        Spacer(Modifier.height(8.dp))

        // Reprint button
        OutlinedButton(
            onClick = { venta?.let { viewModel.imprimirRecibo(it) } },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(8.dp),
        ) {
            Text(
                text = "Reimprimir recibo",
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}
