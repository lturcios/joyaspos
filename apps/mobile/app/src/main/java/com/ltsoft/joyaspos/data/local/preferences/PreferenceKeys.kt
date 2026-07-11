package com.ltsoft.joyaspos.data.local.preferences

import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey

object PreferenceKeys {
    val JWT_TOKEN = stringPreferencesKey("jwt_token")
    val USER_ID = longPreferencesKey("user_id")
    val USERNAME = stringPreferencesKey("username")
    val NOMBRE_COMPLETO = stringPreferencesKey("nombre_completo")
    val ROL = stringPreferencesKey("rol")

    val EMPRESA_ID = longPreferencesKey("empresa_id")
    val SUCURSAL_ID = longPreferencesKey("sucursal_id")            // null if not set = admin without branch
    val SUCURSAL_NOMBRE = stringPreferencesKey("sucursal_nombre")
    val SUCURSALES_JSON = stringPreferencesKey("sucursales_json")  // JSON array of SucursalDto

    // Persists across sessions — not cleared in clearSession()
    val API_URL = stringPreferencesKey("api_url")
}
