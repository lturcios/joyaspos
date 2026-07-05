package com.ltsoft.joyaspos.presentation.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ltsoft.joyaspos.ui.theme.OfflineBannerBg
import com.ltsoft.joyaspos.ui.theme.PendingBannerBg
import com.ltsoft.joyaspos.ui.theme.PendingBannerText

@Composable
fun SyncStatusBanner(
    isOffline: Boolean,
    pendingCount: Int,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        AnimatedVisibility(visible = isOffline) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(OfflineBannerBg)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.WifiOff,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp),
                )
                Text(
                    text = "MODO OFFLINE — SIN CONEXIÓN",
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        AnimatedVisibility(visible = pendingCount > 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PendingBannerBg)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.Sync,
                    contentDescription = null,
                    tint = PendingBannerText,
                    modifier = Modifier.size(18.dp),
                )
                Text(
                    text = "$pendingCount ventas pendientes de sincronizar",
                    style = MaterialTheme.typography.labelLarge,
                    color = PendingBannerText,
                )
            }
        }
    }
}
