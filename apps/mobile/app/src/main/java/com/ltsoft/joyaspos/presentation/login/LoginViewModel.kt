package com.ltsoft.joyaspos.presentation.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import com.ltsoft.joyaspos.data.local.preferences.SettingsPreferences
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.data.remote.dto.LoginRequest
import com.ltsoft.joyaspos.presentation.navigation.AuthStartupState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    object Success : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val sessionPreferences: SessionPreferences,
    private val settingsPreferences: SettingsPreferences,
    private val apiService: ApiService,
) : ViewModel() {

    val authStartupState: StateFlow<AuthStartupState> = combine(
        settingsPreferences.getApiUrl(),
        sessionPreferences.getToken(),
    ) { apiUrl, token ->
        when {
            apiUrl.isNullOrBlank() -> AuthStartupState.NotConfigured
            !token.isNullOrBlank() -> AuthStartupState.Authenticated
            else -> AuthStartupState.Unauthenticated
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AuthStartupState.Loading,
    )

    private val _loginState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

    fun login(username: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginUiState.Loading
            try {
                val response = apiService.login(LoginRequest(username, password))
                if (response.isSuccessful) {
                    val body = response.body()!!
                    sessionPreferences.saveSession(
                        token = body.token,
                        userId = body.user.id,
                        username = body.user.username,
                        nombreCompleto = body.user.nombreCompleto,
                        rol = body.user.rol,
                    )
                    _loginState.value = LoginUiState.Success
                } else {
                    _loginState.value = LoginUiState.Error("Usuario o contraseña incorrectos")
                }
            } catch (e: Exception) {
                _loginState.value = LoginUiState.Error("Error de conexión. Verifica tu red.")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            sessionPreferences.clearSession()
        }
    }
}
