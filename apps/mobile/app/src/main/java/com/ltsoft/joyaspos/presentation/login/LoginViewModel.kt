package com.ltsoft.joyaspos.presentation.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import com.ltsoft.joyaspos.data.local.preferences.SettingsPreferences
import com.ltsoft.joyaspos.data.remote.ApiService
import com.ltsoft.joyaspos.data.remote.dto.LoginRequest
import com.ltsoft.joyaspos.data.remote.dto.SucursalDto
import com.ltsoft.joyaspos.domain.repository.VentaRepository
import com.ltsoft.joyaspos.presentation.navigation.AuthStartupState
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    object Success : LoginUiState()              // vendedor → HOME
    object NeedsSucursalPicker : LoginUiState()  // admin → SUCURSAL_PICKER
    data class Error(val message: String) : LoginUiState()
}

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val sessionPreferences: SessionPreferences,
    private val settingsPreferences: SettingsPreferences,
    private val apiService: ApiService,
    private val moshi: Moshi,
    private val ventaRepository: VentaRepository,
) : ViewModel() {

    val authStartupState: StateFlow<AuthStartupState> = combine(
        settingsPreferences.getApiUrl(),
        sessionPreferences.getToken(),
        sessionPreferences.getSucursalId(),
    ) { apiUrl, token, sucursalId ->
        when {
            apiUrl.isNullOrBlank() -> AuthStartupState.NotConfigured
            token.isNullOrBlank() -> AuthStartupState.Unauthenticated
            // Token exists but no sucursal = admin that hasn't picked a branch yet
            sucursalId == null -> AuthStartupState.NeedsSucursalPicker
            else -> AuthStartupState.Authenticated
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
                    val newSucursalId: Long? = body.user.sucursalId

                    // Cross-sucursal guard: if the incoming user belongs to a DIFFERENT branch
                    // than the one currently stored, check for pending (unsynced) sales.
                    // Pending sales must be synced before switching — otherwise they would be
                    // lost or sent to the wrong branch.
                    val currentSucursalId: Long? = sessionPreferences.getSucursalId().firstOrNull()
                    if (newSucursalId != null &&
                        currentSucursalId != null &&
                        newSucursalId != currentSucursalId
                    ) {
                        val pendientes = ventaRepository.countPendientesOnce()
                        if (pendientes > 0) {
                            _loginState.value = LoginUiState.Error(
                                "Hay $pendientes venta(s) sin sincronizar de otra sucursal. " +
                                "Conéctate a internet y sincroniza antes de cambiar de usuario."
                            )
                            return@launch
                        }
                        // No pending sales — clear Room data from the previous branch
                        ventaRepository.clearAllTables()
                    }

                    // Serialize the sucursales list to JSON for storage and picker screen
                    val sucursalesAdapter = moshi.adapter<List<SucursalDto>>(
                        Types.newParameterizedType(List::class.java, SucursalDto::class.java)
                    )
                    val sucursalesJson = sucursalesAdapter.toJson(body.sucursales)

                    sessionPreferences.saveSession(
                        token = body.token,
                        userId = body.user.id,
                        username = body.user.username,
                        nombreCompleto = body.user.nombreCompleto,
                        rol = body.user.rol,
                        empresaId = body.user.empresaId,
                        sucursalId = newSucursalId,
                        sucursalNombre = body.user.sucursalNombre,
                    )
                    sessionPreferences.saveSucursalesJson(sucursalesJson)

                    _loginState.value = if (newSucursalId != null) LoginUiState.Success
                                        else LoginUiState.NeedsSucursalPicker
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
