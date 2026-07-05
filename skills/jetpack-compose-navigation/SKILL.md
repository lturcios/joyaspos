---
name: jetpack-compose-navigation
description: |
  Configura Navigation Compose para la app Android de JoyasPOS: NavHost con todas
  las rutas (Login, Home, Cart, Confirmation, SalesQuery, SaleDetail), protección
  de rutas autenticadas, paso de argumentos entre pantallas, y gestión del back
  stack. Usar al definir el grafo de navegación por primera vez, al agregar una
  pantalla nueva, al depurar problemas de navegación (back stack, argumentos nulos,
  navegación duplicada), o como referencia de los nombres de ruta y cómo navegar
  entre pantallas desde ViewModels o Composables.
  Depende de SKILL-10 (android-project-structure), SKILL-19 (datastore-preferences)
  para verificar sesión al arrancar, y SKILL-20 (mvvm-viewmodel-stateflow).
---

# SKILL-15 — Navigation Compose (apps/mobile)

## Paquete
`com.ltsoft.joyaspos.presentation.navigation`

---

## 1. Definición de rutas

### `presentation/navigation/Routes.kt`
```kotlin
package com.ltsoft.joyaspos.presentation.navigation

/**
 * Todas las rutas de la app como constantes tipadas.
 * Usar estas constantes en navigate() y en el NavHost — nunca strings literales.
 */
object Routes {
    const val SPLASH = "splash"     // Loader inicial mientras se lee el token de DataStore
    const val LOGIN = "login"
    const val HOME = "home"
    const val CART = "cart"
    const val SALE_CONFIRMATION = "sale_confirmation/{localId}"
    const val SALES_QUERY = "sales_query"
    const val SALE_DETAIL = "sale_detail/{localId}"

    // Helpers para construir rutas con argumentos
    fun saleConfirmation(localId: Long) = "sale_confirmation/$localId"
    fun saleDetail(localId: Long) = "sale_detail/$localId"
}
```

---

## 2. NavHost principal

### `presentation/navigation/AppNavHost.kt`
```kotlin
package com.ltsoft.joyaspos.presentation.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ltsoft.joyaspos.presentation.cart.CartScreen
import com.ltsoft.joyaspos.presentation.confirmation.SaleConfirmationScreen
import com.ltsoft.joyaspos.presentation.home.HomeScreen
import com.ltsoft.joyaspos.presentation.login.LoginScreen
import com.ltsoft.joyaspos.presentation.login.LoginViewModel
import com.ltsoft.joyaspos.presentation.sales.SaleDetailScreen
import com.ltsoft.joyaspos.presentation.sales.SalesQueryScreen

@Composable
fun AppNavHost(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
) {
    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH,    // ← Siempre arranca en Splash
        modifier = modifier,
    ) {

        // ── SPLASH — decide a dónde navegar según el token de DataStore ───────
        composable(Routes.SPLASH) {
            val loginViewModel: LoginViewModel = hiltViewModel()
            val authState by loginViewModel.authStartupState
                .collectAsStateWithLifecycle()

            // Cuando authState pasa de Loading a Authenticated/Unauthenticated, navegar
            LaunchedEffect(authState) {
                when (authState) {
                    AuthStartupState.Loading -> { /* permanecer en splash */ }
                    AuthStartupState.Authenticated -> {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    }
                    AuthStartupState.Unauthenticated -> {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    }
                }
            }

            // Loader simple — visible durante la lectura del DataStore (< 1s)
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        // ── LOGIN ─────────────────────────────────────────────────────────────
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        // Eliminar Login del back stack — no volver con el botón atrás
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        // ── HOME (listado de productos + acceso al carrito) ───────────────────
        composable(Routes.HOME) {
            HomeScreen(
                onNavigateToCart = {
                    navController.navigate(Routes.CART)
                },
                onNavigateToSalesQuery = {
                    navController.navigate(Routes.SALES_QUERY)
                },
                onLogout = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        // ── CART (carrito de compras) ─────────────────────────────────────────
        composable(Routes.CART) {
            CartScreen(
                onVentaConfirmada = { localId ->
                    navController.navigate(Routes.saleConfirmation(localId)) {
                        // Quitar Cart del back stack — tras confirmar no se puede volver
                        popUpTo(Routes.CART) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        // ── SALE CONFIRMATION ─────────────────────────────────────────────────
        composable(
            route = Routes.SALE_CONFIRMATION,
            arguments = listOf(
                navArgument("localId") { type = NavType.LongType }
            )
        ) { backStackEntry ->
            val localId = backStackEntry.arguments?.getLong("localId") ?: 0L
            SaleConfirmationScreen(
                localId = localId,
                onNuevaVenta = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = false }
                    }
                }
            )
        }

        // ── SALES QUERY (historial de ventas) ─────────────────────────────────
        composable(Routes.SALES_QUERY) {
            SalesQueryScreen(
                onNavigateToDetail = { localId ->
                    navController.navigate(Routes.saleDetail(localId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // ── SALE DETAIL ───────────────────────────────────────────────────────
        composable(
            route = Routes.SALE_DETAIL,
            arguments = listOf(
                navArgument("localId") { type = NavType.LongType }
            )
        ) { backStackEntry ->
            val localId = backStackEntry.arguments?.getLong("localId") ?: 0L
            SaleDetailScreen(
                localId = localId,
                onBack = { navController.popBackStack() }
            )
        }
    }
}

/**
 * Estado de arranque de autenticación.
 * Loading: aún leyendo el DataStore (estado inicial de los Flows).
 * Authenticated/Unauthenticated: ya hay valor real del DataStore.
 */
enum class AuthStartupState { Loading, Authenticated, Unauthenticated }
```

---

## 3. Verificación de sesión al arrancar

### `presentation/login/LoginViewModel.kt` (fragmento de sesión)
```kotlin
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val sessionPreferences: SessionPreferences,
    private val apiService: ApiService,
) : ViewModel() {

    /**
     * Estado de arranque que consume el Splash composable.
     *
     * Pasa por tres fases:
     *   Loading       → estado inicial mientras se lee el DataStore
     *   Authenticated → token presente en DataStore
     *   Unauthenticated → token ausente o vacío
     *
     * Se usa `null` como valor centinela "todavía cargando" y se mapea a
     * AuthStartupState para que el NavHost no asuma una decisión prematura.
     */
    val authStartupState: StateFlow<AuthStartupState> = sessionPreferences
        .getToken()
        .map { token ->
            if (!token.isNullOrBlank()) AuthStartupState.Authenticated
            else AuthStartupState.Unauthenticated
        }
        .stateIn(
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

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    object Success : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}
```

---

## 4. Cómo navegar desde un ViewModel

Patrón recomendado: el ViewModel emite un evento de navegación y el Composable
lo observa y llama al navController.

```kotlin
// En el ViewModel
private val _navigationEvent = MutableSharedFlow<NavigationEvent>(extraBufferCapacity = 1)
val navigationEvent = _navigationEvent.asSharedFlow()

fun onVentaConfirmada(localId: Long) {
    _navigationEvent.tryEmit(NavigationEvent.GoToConfirmation(localId))
}

sealed class NavigationEvent {
    data class GoToConfirmation(val localId: Long) : NavigationEvent()
    object GoToLogin : NavigationEvent()
}

// En el Composable
LaunchedEffect(Unit) {
    viewModel.navigationEvent.collect { event ->
        when (event) {
            is NavigationEvent.GoToConfirmation ->
                navController.navigate(Routes.saleConfirmation(event.localId))
            NavigationEvent.GoToLogin ->
                navController.navigate(Routes.LOGIN) {
                    popUpTo(0) { inclusive = true }
                }
        }
    }
}
```

---

## 5. Reglas de navegación

1. **Nunca navegar con strings literales** — siempre usar constantes de `Routes`.
2. **Siempre hacer `popUpTo(Routes.LOGIN) { inclusive = true }`** al navegar tras login — evita volver al Login con el botón atrás.
3. **Siempre hacer `popUpTo(0) { inclusive = true }`** al hacer logout — limpia todo el back stack.
4. **Los argumentos de tipo Long** se declaran como `NavType.LongType` y se leen con `getLong()` — nunca `getString()` con parseo manual.
5. **La ruta `/sync` en el NavHost no existe** — `Routes.SALE_CONFIRMATION` debe registrarse ANTES de rutas que puedan colisionar.
6. **`rememberNavController()`** solo en el punto de entrada (`AppNavHost`) — pasar el controller hacia abajo como parámetro lambda de callback, no como referencia directa.
