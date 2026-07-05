package com.ltsoft.joyaspos.data.local.preferences

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    fun getToken(): Flow<String?> = dataStore.data.map { it[PreferenceKeys.JWT_TOKEN] }

    fun getUserId(): Flow<Long?> = dataStore.data.map { it[PreferenceKeys.USER_ID] }

    fun getUsername(): Flow<String?> = dataStore.data.map { it[PreferenceKeys.USERNAME] }

    fun getNombreCompleto(): Flow<String?> = dataStore.data.map { it[PreferenceKeys.NOMBRE_COMPLETO] }

    fun getRol(): Flow<String?> = dataStore.data.map { it[PreferenceKeys.ROL] }

    fun getSessionData(): Flow<SessionData?> = dataStore.data.map { prefs ->
        val token = prefs[PreferenceKeys.JWT_TOKEN]
        if (token.isNullOrBlank()) null
        else SessionData(
            token = token,
            userId = prefs[PreferenceKeys.USER_ID] ?: 0L,
            username = prefs[PreferenceKeys.USERNAME] ?: "",
            nombreCompleto = prefs[PreferenceKeys.NOMBRE_COMPLETO] ?: "",
            rol = prefs[PreferenceKeys.ROL] ?: "vendedor",
        )
    }

    suspend fun saveSession(token: String, userId: Long, username: String, nombreCompleto: String, rol: String) {
        dataStore.edit { prefs ->
            prefs[PreferenceKeys.JWT_TOKEN] = token
            prefs[PreferenceKeys.USER_ID] = userId
            prefs[PreferenceKeys.USERNAME] = username
            prefs[PreferenceKeys.NOMBRE_COMPLETO] = nombreCompleto
            prefs[PreferenceKeys.ROL] = rol
        }
    }

    suspend fun clearSession() {
        dataStore.edit { prefs ->
            // API_URL se conserva intencionnalmente — no depende de la sesión del usuario
            prefs.remove(PreferenceKeys.JWT_TOKEN)
            prefs.remove(PreferenceKeys.USER_ID)
            prefs.remove(PreferenceKeys.USERNAME)
            prefs.remove(PreferenceKeys.NOMBRE_COMPLETO)
            prefs.remove(PreferenceKeys.ROL)
        }
    }
}

data class SessionData(
    val token: String,
    val userId: Long,
    val username: String,
    val nombreCompleto: String,
    val rol: String,
) {
    val isAdmin: Boolean get() = rol == "admin"
}
