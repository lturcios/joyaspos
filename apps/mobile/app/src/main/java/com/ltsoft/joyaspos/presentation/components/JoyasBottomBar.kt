package com.ltsoft.joyaspos.presentation.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.ltsoft.joyaspos.ui.theme.WarningAmber

enum class BottomTab { INVENTARIO, VENTAS }

private val InactiveColor = Color(0xFF94A3B8)  // slate-400
private val IndicatorColor = Color(0xFFFFF7ED)  // amber-50

@Composable
fun JoyasBottomBar(
    activeTab: BottomTab?,
    pendingCount: Int = 0,
    onInventario: () -> Unit,
    onVentas: () -> Unit,
    onSincronizar: () -> Unit,
    onAjustes: () -> Unit,
) {
    NavigationBar(containerColor = Color.White) {
        NavigationBarItem(
            selected = activeTab == BottomTab.INVENTARIO,
            onClick = onInventario,
            icon = {
                Icon(
                    imageVector = Icons.Default.Store,
                    contentDescription = "Productos",
                )
            },
            label = { Text("Productos") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = WarningAmber,
                selectedTextColor = WarningAmber,
                unselectedIconColor = InactiveColor,
                unselectedTextColor = InactiveColor,
                indicatorColor = IndicatorColor,
            ),
        )
        NavigationBarItem(
            selected = activeTab == BottomTab.VENTAS,
            onClick = onVentas,
            icon = {
                Icon(
                    imageVector = Icons.Default.Receipt,
                    contentDescription = "Historial",
                )
            },
            label = { Text("Historial") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = WarningAmber,
                selectedTextColor = WarningAmber,
                unselectedIconColor = InactiveColor,
                unselectedTextColor = InactiveColor,
                indicatorColor = IndicatorColor,
            ),
        )
        NavigationBarItem(
            selected = false,
            onClick = onSincronizar,
            icon = {
                BadgedBox(
                    badge = {
                        if (pendingCount > 0) {
                            Badge(containerColor = Color(0xFFEF4444))
                        }
                    },
                ) {
                    Icon(
                        imageVector = Icons.Default.Sync,
                        contentDescription = "Sincronizar",
                    )
                }
            },
            label = { Text("Sincronizar") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = WarningAmber,
                selectedTextColor = WarningAmber,
                unselectedIconColor = InactiveColor,
                unselectedTextColor = InactiveColor,
                indicatorColor = IndicatorColor,
            ),
        )
        /*
        NavigationBarItem(
            selected = false,
            onClick = onAjustes,
            icon = {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Ajustes",
                )
            },
            label = { Text("Ajustes") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = WarningAmber,
                selectedTextColor = WarningAmber,
                unselectedIconColor = InactiveColor,
                unselectedTextColor = InactiveColor,
                indicatorColor = IndicatorColor,
            ),
        )
         */
    }
}
