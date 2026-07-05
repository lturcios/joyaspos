package com.ltsoft.joyaspos.presentation.navigation

object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val SETTINGS = "settings"
    const val AUTHENTICATED = "authenticated"
    const val HOME = "home"
    const val CART = "cart"
    const val SALE_CONFIRMATION = "sale_confirmation/{localId}"
    const val SALES_QUERY = "sales_query"
    const val SALE_DETAIL = "sale_detail/{localId}"

    fun saleConfirmation(localId: Long) = "sale_confirmation/$localId"
    fun saleDetail(localId: Long) = "sale_detail/$localId"
}

enum class AuthStartupState { Loading, Authenticated, Unauthenticated, NotConfigured }
