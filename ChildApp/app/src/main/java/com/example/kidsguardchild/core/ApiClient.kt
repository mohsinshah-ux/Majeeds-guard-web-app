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

    fun init(baseUrl: String, context: Context? = null) {
        var normalized = baseUrl.trim()
        // Allow pasting an invite link; keep only scheme + host for API calls.
        normalized = normalized.replace(Regex("/bind/.*$"), "")
        normalized = normalized.replace(Regex("/+$"), "")
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://$normalized"
        }
        _baseUrl = "$normalized/"

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val deviceInterceptor = Interceptor { chain ->
            val request = chain.request()
            val deviceId = context?.let { PermissionHelper.getDeviceId(it) }
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
            .connectTimeout(45, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .writeTimeout(45, TimeUnit.SECONDS)
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
