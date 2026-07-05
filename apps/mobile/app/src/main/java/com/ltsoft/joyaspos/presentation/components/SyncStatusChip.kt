package com.ltsoft.joyaspos.presentation.components

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import com.ltsoft.joyaspos.ui.theme.PendingOrange

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
}
