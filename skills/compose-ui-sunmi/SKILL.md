---
name: compose-ui-sunmi
description: |
  Guía de UI con Jetpack Compose optimizada para el Sunmi V2SE (pantalla táctil
  5.99", 1080×2160): toque mínimo 48dp, fuentes mínimas 14sp/16sp, teclado
  numérico para precios y cantidades, estados de pantalla (loading/error/empty),
  banners de estado offline y pendientes de sync, y componentes reutilizables del
  proyecto (ProductoCard, CartItemRow, SyncStatusBanner, PeriodoSelector).
  Usar al construir cualquier pantalla de la app, al verificar que un componente
  cumple las restricciones de usabilidad del Sunmi, o como referencia de los
  componentes compartidos disponibles y cómo usarlos.
  Depende de SKILL-10 (android-project-structure), SKILL-20 (mvvm-viewmodel-stateflow)
  y SKILL-00D (design-system) — leer design-system PRIMERO porque define el
  Theme.kt exacto con la paleta de marca (dorado antiguo + carbón + marfil);
  sin él, la app usa los colores Material por defecto (morado/azul genérico
  de Android), no la identidad de JoyasPOS.
---

# SKILL-16 — Compose UI para Sunmi V2SE (apps/mobile)

## Restricciones del dispositivo
- Pantalla: 5.99" — 1080 × 2160 px — orientación vertical fija
- Uso táctil con dedo: área mínima de toque **48dp × 48dp** (obligatorio)
- Fuentes: mínimo **14sp** en listas, **16sp** en botones y campos de formulario
- Teclado numérico para cantidades y precios (`KeyboardType.Decimal`)

---

## 1. Tema y tokens de diseño

> **`Theme.kt` y `Type.kt` completos están en SKILL-00D (design-system),
> secciones 5 y 6.** Esta skill asume que ya existen y usa
> `MaterialTheme.colorScheme.xxx` / `MaterialTheme.typography.xxx` en todos
> los componentes de abajo — nunca colores hardcodeados como `Color(0xFF...)`
> sueltos fuera de `Theme.kt`.
>
> **Verificación rápida:** si al correr la app en el emulador/Sunmi los
> colores se ven morado/azul genérico de Material Design en lugar de dorado/
> carbón, `JoyasPOSTheme` no está envolviendo `setContent` en `MainActivity`
> (ver SKILL-10 sección "MainActivity.kt") o `Theme.kt` no tiene el contenido
> de SKILL-00D.

---

## 2. Componentes reutilizables compartidos

### `presentation/components/SyncStatusBanner.kt`
```kotlin
package com.ltsoft.joyaspos.presentation.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ltsoft.joyaspos.ui.theme.PendingOrange
import com.ltsoft.joyaspos.ui.theme.WarningAmber

/**
 * Banner que muestra el estado de conectividad y ventas pendientes.
 * Usar en HomeScreen encima del listado de productos.
 */
@Composable
fun SyncStatusBanner(
    isOffline: Boolean,
    pendingCount: Int,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        // Banner de modo offline
        AnimatedVisibility(visible = isOffline) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(WarningAmber)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.WifiOff,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
                Text(
                    text = "Modo offline — sin conexión",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }

        // Banner de pendientes
        AnimatedVisibility(visible = pendingCount > 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PendingOrange)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.Sync,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
                Text(
                    text = "$pendingCount venta(s) pendiente(s) de sincronizar",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
    }
}
```

### `presentation/components/SyncStatusChip.kt`
```kotlin
package com.ltsoft.joyaspos.presentation.components

import androidx.compose.foundation.layout.size
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ltsoft.joyaspos.ui.theme.PendingOrange
import com.ltsoft.joyaspos.ui.theme.SuccessGreen

/**
 * Chip que indica el estado de sincronización de una venta.
 * Usar en las filas del historial de ventas.
 */
@Composable
fun SyncStatusChip(sincronizado: Boolean) {
    if (!sincronizado) {
        SuggestionChip(
            onClick = {},
            label = {
                Text(
                    text = "Pendiente",
                    style = MaterialTheme.typography.labelSmall,
                )
            },
            colors = SuggestionChipDefaults.suggestionChipColors(
                containerColor = PendingOrange,
                labelColor = MaterialTheme.colorScheme.onPrimary,
            ),
        )
    }
    // Si está sincronizado, no mostrar chip (ausencia de chip = OK)
}
```

### `presentation/components/ProductoCard.kt`
```kotlin
package com.ltsoft.joyaspos.presentation.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity

/**
 * Tarjeta de producto para el listado en HomeScreen.
 * Área de toque: mínimo 72dp de alto para cumplir el requisito de 48dp táctil.
 */
@Composable
fun ProductoCard(
    producto: ProductoEntity,
    onAgregar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 72.dp),    // Mínimo para área táctil adecuada
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = producto.nombre,
                    style = MaterialTheme.typography.titleMedium,  // 16sp
                )
                Text(
                    text = "Stock: ${producto.existencia} ${producto.unidadMedida}",
                    style = MaterialTheme.typography.bodyMedium,   // 14sp
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            // Botón con área mínima 48dp × 48dp
            FilledTonalButton(
                onClick = onAgregar,
                modifier = Modifier.defaultMinSize(minWidth = 80.dp, minHeight = 48.dp),
            ) {
                Text("Agregar", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
```

### `presentation/components/PeriodoSelector.kt`
```kotlin
package com.ltsoft.joyaspos.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class PeriodoOption(val label: String, val key: String)

val PERIODO_OPTIONS = listOf(
    PeriodoOption("Hoy", "hoy"),
    PeriodoOption("Esta semana", "esta_semana"),
    PeriodoOption("Esta quincena", "esta_quincena"),
    PeriodoOption("Este mes", "este_mes"),
)

/**
 * Selector de período reutilizable.
 * Emite el key del período seleccionado ("hoy", "esta_semana", etc.).
 * Usar en SalesQueryScreen.
 */
@Composable
fun PeriodoSelector(
    selectedKey: String,
    onPeriodoSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    // ScrollableTabRow para que quepan todos los atajos en pantalla estrecha
    ScrollableTabRow(
        selectedTabIndex = PERIODO_OPTIONS.indexOfFirst { it.key == selectedKey }
            .coerceAtLeast(0),
        modifier = modifier,
        edgePadding = 0.dp,
    ) {
        PERIODO_OPTIONS.forEach { option ->
            Tab(
                selected = selectedKey == option.key,
                onClick = { onPeriodoSelected(option.key) },
                modifier = Modifier.height(48.dp),   // Área táctil mínima
                text = {
                    Text(
                        text = option.label,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            )
        }
    }
}
```

---

## 3. Modal de agregar ítem al carrito

```kotlin
package com.ltsoft.joyaspos.presentation.cart

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.ltsoft.joyaspos.data.local.entity.ProductoEntity

/**
 * Dialog para agregar un producto al carrito.
 * Campos: cantidad (numérico), precio unitario (decimal), detalle adicional (texto libre).
 * Subtotal calculado en tiempo real.
 */
@Composable
fun AddItemDialog(
    producto: ProductoEntity,
    onConfirmar: (cantidad: Double, precio: Double, detalleAdicional: String) -> Unit,
    onDismiss: () -> Unit,
) {
    var cantidad by remember { mutableStateOf("") }
    var precio by remember { mutableStateOf("") }
    var detalleAdicional by remember { mutableStateOf("") }

    val cantidadDouble = cantidad.toDoubleOrNull() ?: 0.0
    val precioDouble = precio.toDoubleOrNull() ?: 0.0
    val subtotal = cantidadDouble * precioDouble
    val isValid = cantidadDouble > 0 && precioDouble > 0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = producto.nombre, style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Cantidad
                OutlinedTextField(
                    value = cantidad,
                    onValueChange = { cantidad = it },
                    label = { Text("Cantidad *") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge,  // 16sp
                )

                // Precio unitario
                OutlinedTextField(
                    value = precio,
                    onValueChange = { precio = it },
                    label = { Text("Precio unitario *") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    prefix = { Text("$") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge,
                )

                // Detalle adicional (opcional)
                OutlinedTextField(
                    value = detalleAdicional,
                    onValueChange = { detalleAdicional = it },
                    label = { Text("Detalle adicional (opcional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge,
                )

                // Subtotal en tiempo real
                if (isValid) {
                    Text(
                        text = "Subtotal: $${"%.2f".format(subtotal)}",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirmar(cantidadDouble, precioDouble, detalleAdicional.trim()) },
                enabled = isValid,
                modifier = Modifier
                    .defaultMinSize(minWidth = 120.dp, minHeight = 48.dp),
            ) {
                Text("Agregar al carrito", style = MaterialTheme.typography.labelLarge)
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
            ) {
                Text("Cancelar")
            }
        },
    )
}
```

---

## 4. Estados de pantalla reutilizables

```kotlin
package com.ltsoft.joyaspos.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LoadingState(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorState(
    message: String,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Default.ErrorOutline,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.error,
            modifier = Modifier.size(48.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.error,
        )
        if (onRetry != null) {
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onRetry,
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
            ) {
                Text("Reintentar", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
fun EmptyState(message: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Default.Inbox,
            contentDescription = null,
            modifier = Modifier.size(56.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
```

---

## 5. Checklist de usabilidad Sunmi (aplicar a cada pantalla)

Antes de considerar una pantalla terminada, verificar:

- [ ] Todo elemento interactivo tiene `defaultMinSize(minHeight = 48.dp)` o `heightIn(min = 48.dp)`
- [ ] Texto de listas y labels usa mínimo `MaterialTheme.typography.bodyMedium` (14sp)
- [ ] Texto de botones y campos usa mínimo `MaterialTheme.typography.labelLarge` (14sp Medium)
- [ ] Campos numéricos tienen `KeyboardOptions(keyboardType = KeyboardType.Decimal)`
- [ ] La pantalla no desborda horizontalmente en 1080px de ancho
- [ ] Existe estado de loading (`CircularProgressIndicator`)
- [ ] Existe estado de error con mensaje y opción de reintento
- [ ] Existe estado vacío con mensaje descriptivo (no tabla vacía sin texto)
- [ ] Los colores de estado offline/pendiente usan `WarningAmber` / `PendingOrange`
