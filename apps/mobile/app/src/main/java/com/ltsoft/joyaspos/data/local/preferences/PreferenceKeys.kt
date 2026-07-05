package com.ltsoft.joyaspos.data.local.preferences

import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey

object PreferenceKeys {
    val JWT_TOKEN = stringPreferencesKey("jwt_token")
    val USER_ID = longPreferencesKey("user_id")
    val USERNAME = stringPreferencesKey("username")
    val NOMBRE_COMPLETO = stringPreferencesKey("nombre_completo")
    val ROL = stringPreferencesKey("rol")

    // Persiste entre sesiones — no se borra en clearSession()
    val API_URL = stringPreferencesKey("api_url")
}
