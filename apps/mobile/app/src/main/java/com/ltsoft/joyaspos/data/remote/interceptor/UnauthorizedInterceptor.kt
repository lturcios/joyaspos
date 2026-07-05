package com.ltsoft.joyaspos.data.remote.interceptor

import android.content.Context
import android.content.Intent
import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class UnauthorizedInterceptor @Inject constructor(
    @ApplicationContext private val context: Context,
    private val sessionPreferences: SessionPreferences,
) : Interceptor {

    companion object {
        const val ACTION_UNAUTHORIZED = "com.ltsoft.joyaspos.UNAUTHORIZED"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())

        if (response.code == 401) {
            runBlocking { sessionPreferences.clearSession() }
            context.sendBroadcast(Intent(ACTION_UNAUTHORIZED))
        }

        return response
    }
}
