package com.ltsoft.joyaspos.presentation.login

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ltsoft.joyaspos.ui.theme.SlateBackground
import com.ltsoft.joyaspos.ui.theme.UnitBadgeText

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onAdminNeedsPicker: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val loginState by viewModel.loginState.collectAsStateWithLifecycle()
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    LaunchedEffect(loginState) {
        when (loginState) {
            is LoginUiState.Success -> onLoginSuccess()
            is LoginUiState.NeedsSucursalPicker -> onAdminNeedsPicker()
            else -> Unit
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(top = 48.dp, bottom = 32.dp),
    ) {
        // Hero card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A)),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color(0xFFAF9B45), Color(0xFF583714)),
                        )
                    )
                    .padding(24.dp),
                contentAlignment = Alignment.BottomStart,
            ) {
                Column {
                    Text(
                        text = "JoyasPOS",
                        style = MaterialTheme.typography.headlineLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "Gestión de Inventario de Lujo",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.7f),
                    )
                }
            }
        }

        Spacer(Modifier.height(32.dp))

        Text(
            text = "Iniciar Sesión",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )

        Spacer(Modifier.height(24.dp))

        // Username field
        Text(
            text = "USUARIO",
            style = MaterialTheme.typography.labelSmall,
            color = UnitBadgeText,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            placeholder = { Text("Nombre de usuario") },
            leadingIcon = {
                Icon(Icons.Default.Person, contentDescription = null)
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge,
            shape = RoundedCornerShape(8.dp),
        )

        Spacer(Modifier.height(16.dp))

        // Password field
        Text(
            text = "CONTRASEÑA",
            style = MaterialTheme.typography.labelSmall,
            color = UnitBadgeText,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            placeholder = { Text("••••••••") },
            leadingIcon = {
                Icon(Icons.Default.Lock, contentDescription = null)
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            textStyle = MaterialTheme.typography.bodyLarge,
            shape = RoundedCornerShape(8.dp),
        )

        if (loginState is LoginUiState.Error) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = (loginState as LoginUiState.Error).message,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = { viewModel.login(username.trim(), password) },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            enabled = loginState !is LoginUiState.Loading &&
                username.isNotBlank() && password.isNotBlank(),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF111827),
                contentColor = Color.White,
            ),
        ) {
            if (loginState is LoginUiState.Loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.White,
                    strokeWidth = 2.dp,
                )
            } else {
                Text(
                    text = "Iniciar Sesión",
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }

        Spacer(Modifier.height(12.dp))

        Text(
            text = "Configurar dirección del servidor",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .combinedClickable(
                    onClick = {},
                    onLongClick = onNavigateToSettings,
                )
                .padding(vertical = 12.dp),
        )
    }
}
