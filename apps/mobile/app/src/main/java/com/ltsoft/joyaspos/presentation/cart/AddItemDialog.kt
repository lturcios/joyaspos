package com.ltsoft.joyaspos.presentation.cart

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.ui.theme.UnitBadgeText
import com.ltsoft.joyaspos.ui.theme.WarningAmber
import kotlinx.coroutines.launch

private fun formatExistencia(e: Double): String =
    if (e % 1.0 == 0.0) e.toInt().toString() else e.toString()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddItemDialog(
    producto: ProductoEntity,
    onConfirmar: (cantidad: Double, precio: Double, detalleAdicional: String) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    var cantidad by remember { mutableStateOf("") }
    var precio by remember { mutableStateOf("") }
    var detalleAdicional by remember { mutableStateOf("") }

    val cantidadDouble = cantidad.toDoubleOrNull() ?: 0.0
    val precioDouble = precio.toDoubleOrNull() ?: 0.0
    val subtotal = cantidadDouble * precioDouble
    val isValid = cantidadDouble > 0 && precioDouble > 0

    fun dismiss() {
        scope.launch {
            sheetState.hide()
        }.invokeOnCompletion {
            if (!sheetState.isVisible) onDismiss()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color.White,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Agregar Item: ${producto.nombre}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                Surface(
                    shape = CircleShape,
                    color = Color(0xFFF1F5F9),
                ) {
                    IconButton(onClick = ::dismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Cerrar",
                        )
                    }
                }
            }

            Spacer(Modifier.height(4.dp))

            Text(
                text = "${producto.unidadMedida} • Stock: ${formatExistencia(producto.existencia)}",
                style = MaterialTheme.typography.labelMedium,
                color = WarningAmber,
            )

            Spacer(Modifier.height(16.dp))

            // Two-column input row
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "CANTIDAD (${producto.unidadMedida.uppercase()})",
                        style = MaterialTheme.typography.labelSmall,
                        color = UnitBadgeText,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(4.dp))
                    OutlinedTextField(
                        value = cantidad,
                        onValueChange = { cantidad = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        suffix = {
                            Text(
                                text = producto.unidadMedida,
                                style = MaterialTheme.typography.bodySmall,
                                color = UnitBadgeText,
                            )
                        },
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "PRECIO UNIT. (\$)",
                        style = MaterialTheme.typography.labelSmall,
                        color = UnitBadgeText,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(4.dp))
                    OutlinedTextField(
                        value = precio,
                        onValueChange = { precio = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        prefix = { Text("$") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Text(
                text = "DETALLE ADICIONAL (OPCIONAL)",
                style = MaterialTheme.typography.labelSmall,
                color = UnitBadgeText,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(4.dp))
            OutlinedTextField(
                value = detalleAdicional,
                onValueChange = { detalleAdicional = it },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 3,
            )

            Spacer(Modifier.height(12.dp))

            // Subtotal card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Subtotal",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        text = "$${"%.2f".format(subtotal)}",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Action buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedButton(
                    onClick = ::dismiss,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                ) {
                    Text("Cancelar")
                }
                Button(
                    onClick = {
                        onConfirmar(cantidadDouble, precioDouble, detalleAdicional.trim())
                    },
                    enabled = isValid,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF111827),
                        contentColor = Color.White,
                    ),
                ) {
                    Icon(
                        imageVector = Icons.Default.ShoppingCart,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = "Agregar",
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }
    }
}
