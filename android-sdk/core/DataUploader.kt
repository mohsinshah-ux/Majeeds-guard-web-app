package com.parentalcontrol.sdk.core

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Uploads collected module payloads to the backend.
 *
 * All uploads are fire-and-forget from an IO coroutine.
 * Failures are logged; no data is silently dropped — add a local Room queue
 * here when you need guaranteed delivery.
 */
class DataUploader(
    private val baseUrl: String,
    private val deviceId: String
) {
    companion object {
        private const val TAG              = "DataUploader"
        private const val CONNECT_TIMEOUT  = 15_000
        private const val READ_TIMEOUT     = 15_000
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /**
     * POST JSON payload to [endpoint].  Example: endpoint = "/api/locations"
     */
    fun upload(endpoint: String, payload: JSONObject) {
        payload.put("deviceId", deviceId)
        scope.launch {
            runCatching { post(endpoint, payload.toString()) }
                .onSuccess { Log.d(TAG, "Uploaded to $endpoint OK") }
                .onFailure { Log.e(TAG, "Upload to $endpoint failed: ${it.message}") }
        }
    }

    private fun post(endpoint: String, body: String) {
        val url  = URL("$baseUrl$endpoint")
        val conn = url.openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.doOutput      = true
            conn.connectTimeout = CONNECT_TIMEOUT
            conn.readTimeout    = READ_TIMEOUT
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept",       "application/json")
            conn.outputStream.bufferedWriter().use { it.write(body) }
            if (conn.responseCode !in 200..299) {
                Log.w(TAG, "Server responded ${conn.responseCode} for $endpoint")
            }
        } finally {
            conn.disconnect()
        }
    }

    fun shutdown() {
        scope.cancel()
    }
}
