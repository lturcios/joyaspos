package com.ltsoft.joyaspos.presentation.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.ui.theme.SlateBackground
import com.ltsoft.joyaspos.ui.theme.UnitBadgeText

@Composable
fun ApiSettingsScreen(
    onSaved: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val currentUrl by viewModel.currentUrl.collectAsStateWithLifecycle()
    var urlInput by rememberSaveable { mutableStateOf("") }

    // Pre-fill once on load
    LaunchedEffect(currentUrl) {
        if (urlInput.isEmpty() && currentUrl.isNotEmpty()) {
            urlInput = currentUrl
        }
    }

    val isValid = remember(urlInput) {
        urlInput.trimEnd('/').let { it.startsWith("http://") || it.startsWith("https://") }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(top = 48.dp, bottom = 32.dp),
    ) {
        Text(
            text = "Configuración del servidor",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "Ingresá la dirección IP y puerto del servidor API en tu red local.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
        )

        Spacer(Modifier.height(32.dp))

        Text(
            text = "DIRECCIÓN DEL SERVIDOR",
            style = MaterialTheme.typography.labelSmall,
            color = UnitBadgeText,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = urlInput,
            onValueChange = { urlInput = it },
            placeholder = { Text("http://192.168.1.100:3000") },
            leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge,
            shape = RoundedCornerShape(8.dp),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Uri,
                imeAction = ImeAction.Done,
            ),
            isError = urlInput.isNotEmpty() && !isValid,
            supportingText = {
                if (urlInput.isNotEmpty() && !isValid) {
                    Text("Debe empezar con http:// o https://")
                }
            },
        )

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = { viewModel.saveUrl(urlInput.trim(), onSaved) },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            enabled = isValid,
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF111827),
                contentColor = Color.White,
            ),
        ) {
            Text(
                text = "Guardar",
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}
