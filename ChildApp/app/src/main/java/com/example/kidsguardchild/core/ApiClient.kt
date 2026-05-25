package com.example.kidsguardchild.core

import android.content.Context
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton API client. Call ApiClient.init(baseUrl, context) before using ApiClient.service.
 * Sends X-Device-Id on every request when the device is paired.
 */
object ApiClient {

    lateinit var service: ApiService
        private set

    private var _baseUrl: String = "http://localhost:8080/"

    val baseUrl: String get() = _baseUrl

    /** Normalize parent dashboard URL (scheme + host only). */
    fun normalizeServerUrl(baseUrl: String): String {
        var normalized = baseUrl.trim()
        normalized = normalized.replace(Regex("/bind/.*$"), "")
        normalized = normalized.replace(Regex("/api/?$"), "")
        normalized = normalized.replace(Regex("/+$"), "")
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://$normalized"
        }
        return "$normalized/"
    }

    /** Pairing / health checks — never send X-Device-Id (avoids HTTP 401 on Vercel). */
    fun initForPairing(baseUrl: String) {
        buildClient(baseUrl, attachDeviceId = false, context = null)
    }

    /** After pairing — attaches X-Device-Id for telemetry uploads. */
    fun init(baseUrl: String, context: Context? = null) {
        buildClient(baseUrl, attachDeviceId = true, context = context)
    }

    private fun buildClient(baseUrl: String, attachDeviceId: Boolean, context: Context?) {
        _baseUrl = normalizeServerUrl(baseUrl)

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val deviceInterceptor = Interceptor { chain ->
            val request = chain.request()
            val path = request.url.encodedPath
            val isPairingCall = path.contains("/device-invitations/") && path.endsWith("/redeem")
            val deviceId = if (attachDeviceId && !isPairingCall) {
                context?.let { PermissionHelper.getDeviceId(it) }
            } else {
                null
            }
            val newRequest = if (!deviceId.isNullOrBlank()) {
                request.newBuilder()
                    .addHeader("X-Device-Id", deviceId)
                    .build()
            } else {
                request
            }
            chain.proceed(newRequest)
        }

        val client = OkHttpClient.Builder()
            .connectTimeout(90, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .writeTimeout(90, TimeUnit.SECONDS)
            .addInterceptor(deviceInterceptor)
            .addInterceptor(logging)
            .build()

        service = Retrofit.Builder()
            .baseUrl(_baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
