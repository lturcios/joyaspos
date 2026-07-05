package com.ltsoft.joyaspos.presentation.components

import androidx.compose.foundation.layout.height
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class PeriodoOption(val label: String, val key: String)

val PERIODO_OPTIONS = listOf(
    PeriodoOption("Hoy", "hoy"),
    PeriodoOption("Esta semana", "esta_semana"),
    PeriodoOption("Esta quincena", "esta_quincena"),
    PeriodoOption("Este mes", "este_mes"),
)

@Composable
fun PeriodoSelector(
    selectedKey: String,
    onPeriodoSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    ScrollableTabRow(
        selectedTabIndex = PERIODO_OPTIONS.indexOfFirst { it.key == selectedKey }.coerceAtLeast(0),
        modifier = modifier,
        edgePadding = 0.dp,
    ) {
        PERIODO_OPTIONS.forEach { option ->
            Tab(
                selected = selectedKey == option.key,
                onClick = { onPeriodoSelected(option.key) },
                modifier = Modifier.height(48.dp),
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
