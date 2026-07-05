package com.ltsoft.joyaspos.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity
import com.ltsoft.joyaspos.ui.theme.LowStockRed
import com.ltsoft.joyaspos.ui.theme.SlateBackground
import com.ltsoft.joyaspos.ui.theme.SlateIcon
import com.ltsoft.joyaspos.ui.theme.UnitBadgeBg
import com.ltsoft.joyaspos.ui.theme.UnitBadgeText
import com.ltsoft.joyaspos.ui.theme.WarningAmber

private fun formatExistencia(e: Double): String =
    if (e % 1.0 == 0.0) e.toInt().toString() else e.toString()

@Composable
fun ProductoCard(
    producto: ProductoEntity,
    onAgregar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val stockColor = when {
        producto.existencia <= 5.0 -> LowStockRed
        producto.existencia <= 15.0 -> WarningAmber
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Card(
        modifier = modifier.fillMaxWidth(),
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
            // Left: icon placeholder
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(SlateBackground),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = SlateIcon,
                    modifier = Modifier.size(32.dp),
                )
            }

            // Center: name + badge + stock
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = producto.nombre,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    // Unit badge chip
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(UnitBadgeBg)
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                    ) {
                        Text(
                            text = producto.unidadMedida.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = UnitBadgeText,
                        )
                    }
                    Text(
                        text = "•",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "Stock: ${formatExistencia(producto.existencia)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = stockColor,
                    )
                }
            }

            // Right: low stock badge + add button
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (producto.existencia <= 5.0) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(LowStockRed.copy(alpha = 0.12f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            text = "Stock bajo",
                            style = MaterialTheme.typography.labelSmall,
                            color = LowStockRed,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                Button(
                    onClick = onAgregar,
                    modifier = Modifier.defaultMinSize(minHeight = 40.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF111827),
                        contentColor = Color.White,
                    ),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp),
                ) {
                    Text("Agregar", style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}
