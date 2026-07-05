package com.ltsoft.joyaspos.ui.theme

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

// ── Screen backgrounds ────────────────────────────────────────────────────────
val SlateBackground = Color(0xFFF1F5F9)    // slate-100 — screen background
val SurfaceWhite = Color(0xFFFFFFFF)       // white — cards, inputs

// ── Action colors ─────────────────────────────────────────────────────────────
val DarkButtonColor = Color(0xFF111827)    // gray-900 — primary action buttons

// ── State colors ──────────────────────────────────────────────────────────────
val ErrorRed = Color(0xFFDC2626)           // red-600
val WarningAmber = Color(0xFFD97706)       // amber-600 — active tab, brand accent
val SuccessGreen = Color(0xFF16A34A)       // green-600
val LowStockRed = Color(0xFFEF4444)        // red-500 — stock ≤ 5

// ── Banner colors ─────────────────────────────────────────────────────────────
val OfflineBannerBg = Color(0xFF374151)    // gray-700 — offline strip background
val PendingBannerBg = Color(0xFFEFF6FF)    // blue-50 — pending strip background
val PendingBannerText = Color(0xFF1E40AF)  // blue-800 — pending strip text/icon

// ── Unit badge ────────────────────────────────────────────────────────────────
val UnitBadgeBg = Color(0xFFE2E8F0)        // slate-200
val UnitBadgeText = Color(0xFF475569)      // slate-600
val SlateIcon = Color(0xFF94A3B8)          // slate-400 — placeholder icons

// ── Legacy aliases kept for compatibility ─────────────────────────────────────
val GoldPrimary = Color(0xFFA8763E)
val GoldLight = Color(0xFFC9A267)
val CharcoalDark = Color(0xFF0F172A)       // slate-900
val IvoryBackground = SlateBackground
val PendingOrange = Color(0xFFEA580C)      // retained — no longer used in banners

private val LightColorScheme = lightColorScheme(
    primary = DarkButtonColor,
    onPrimary = SurfaceWhite,
    primaryContainer = Color(0xFFF1F5F9),
    onPrimaryContainer = CharcoalDark,

    secondary = Color(0xFF475569),         // slate-600
    onSecondary = SurfaceWhite,

    background = SlateBackground,
    onBackground = CharcoalDark,

    surface = SurfaceWhite,
    onSurface = CharcoalDark,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF475569),  // slate-600

    error = ErrorRed,
    onError = SurfaceWhite,

    outline = Color(0xFFCBD5E1),           // slate-300
)

@Composable
fun JoyasPOSTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = JoyasTypography,
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            content()
        }
    }
}
