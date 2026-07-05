package com.ltsoft.joyaspos.data.remote.interceptor

import com.ltsoft.joyaspos.data.local.preferences.SettingsPreferences
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DynamicBaseUrlInterceptor @Inject constructor(
    private val settingsPreferences: SettingsPreferences,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val baseUrl = runBlocking { settingsPreferences.getApiUrl().firstOrNull() }
            ?: throw IOException("API URL not configured. Configure it in Settings.")

        val parsed = "${baseUrl.trimEnd('/')}/".toHttpUrl()
        val newUrl = chain.request().url.newBuilder()
            .scheme(parsed.scheme)
            .host(parsed.host)
            .port(parsed.port)
            .build()

        return chain.proceed(chain.request().newBuilder().url(newUrl).build())
    }
}
