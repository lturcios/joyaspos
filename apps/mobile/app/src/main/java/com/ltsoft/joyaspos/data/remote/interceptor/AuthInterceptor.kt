package com.ltsoft.joyaspos.data.remote.interceptor

import com.ltsoft.joyaspos.data.local.preferences.SessionPreferences
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val sessionPreferences: SessionPreferences,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        if (originalRequest.url.encodedPath.contains("auth/login")) {
            return chain.proceed(originalRequest)
        }
        val token = runBlocking { sessionPreferences.getToken().firstOrNull() }
        val request = if (!token.isNullOrBlank()) {
            originalRequest.newBuilder().header("Authorization", "Bearer $token").build()
        } else originalRequest
        return chain.proceed(request)
    }
}
