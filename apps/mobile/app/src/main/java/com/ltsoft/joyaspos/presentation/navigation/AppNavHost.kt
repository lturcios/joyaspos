package com.ltsoft.joyaspos.presentation.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.navigation
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ltsoft.joyaspos.presentation.cart.CartScreen
import com.ltsoft.joyaspos.presentation.cart.CartViewModel
import com.ltsoft.joyaspos.presentation.confirmation.SaleConfirmationScreen
import com.ltsoft.joyaspos.presentation.home.HomeScreen
import com.ltsoft.joyaspos.presentation.login.LoginScreen
import com.ltsoft.joyaspos.presentation.login.LoginViewModel
import com.ltsoft.joyaspos.presentation.sales.SaleDetailScreen
import com.ltsoft.joyaspos.presentation.sales.SalesQueryScreen
import com.ltsoft.joyaspos.presentation.settings.ApiSettingsScreen

@Composable
fun AppNavHost(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
) {
    // CartViewModel created before NavHost — uses Activity as owner so it's shared
    // across Home and Cart composables without losing state during navigation.
    val cartViewModel: CartViewModel = hiltViewModel()

    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH,
        modifier = modifier,
    ) {

        // ── SPLASH ───────────────────────────────────────────────────────────
        composable(Routes.SPLASH) {
            val loginViewModel: LoginViewModel = hiltViewModel()
            val authState by loginViewModel.authStartupState.collectAsStateWithLifecycle()

            LaunchedEffect(authState) {
                when (authState) {
                    AuthStartupState.Loading -> Unit
                    AuthStartupState.NotConfigured ->
                        navController.navigate(Routes.SETTINGS) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    AuthStartupState.Authenticated ->
                        navController.navigate(Routes.AUTHENTICATED) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    AuthStartupState.Unauthenticated ->
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                }
            }

            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        // ── SETTINGS ─────────────────────────────────────────────────────────
        composable(Routes.SETTINGS) {
            ApiSettingsScreen(
                onSaved = {
                    // Limpia el back stack completo y va a LOGIN — válido tanto en
                    // primer arranque (sin historial) como al venir desde LOGIN.
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        // ── LOGIN ─────────────────────────────────────────────────────────────
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.AUTHENTICATED) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToSettings = {
                    navController.navigate(Routes.SETTINGS)
                },
            )
        }

        // ── AUTHENTICATED nested graph ─────────────────────────────────────────
        navigation(startDestination = Routes.HOME, route = Routes.AUTHENTICATED) {

            composable(Routes.HOME) {
                HomeScreen(
                    cartViewModel = cartViewModel,
                    onNavigateToCart = {
                        navController.navigate(Routes.CART) { launchSingleTop = true }
                    },
                    onNavigateToSalesQuery = {
                        navController.navigate(Routes.SALES_QUERY) { launchSingleTop = true }
                    },
                    onLogout = {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            composable(Routes.CART) {
                CartScreen(
                    cartViewModel = cartViewModel,
                    onVentaConfirmada = { localId ->
                        navController.navigate(Routes.saleConfirmation(localId)) {
                            popUpTo(Routes.CART) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() },
                    onNavigateToHome = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                    onNavigateToSalesQuery = {
                        navController.navigate(Routes.SALES_QUERY) { launchSingleTop = true }
                    },
                )
            }

            composable(
                route = Routes.SALE_CONFIRMATION,
                arguments = listOf(navArgument("localId") { type = NavType.LongType })
            ) { backStackEntry ->
                val localId = backStackEntry.arguments?.getLong("localId") ?: 0L
                SaleConfirmationScreen(
                    localId = localId,
                    onNuevaVenta = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = false }
                            launchSingleTop = true
                        }
                    }
                )
            }

            composable(Routes.SALES_QUERY) {
                SalesQueryScreen(
                    onNavigateToDetail = { localId ->
                        navController.navigate(Routes.saleDetail(localId))
                    },
                    onBack = { navController.popBackStack() },
                    onNavigateToHome = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                )
            }

            composable(
                route = Routes.SALE_DETAIL,
                arguments = listOf(navArgument("localId") { type = NavType.LongType })
            ) { backStackEntry ->
                val localId = backStackEntry.arguments?.getLong("localId") ?: 0L
                SaleDetailScreen(
                    localId = localId,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
