package com.parentalcontrol.sdk.core

import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Fetches remote module configuration from the backend.
 *
 * Endpoint: GET /device/config
 * Expected response:
 * {
 *   "usage":true, "contacts":true, "calls":true, "sms":true,
 *   "location":true, "notifications":true, "wifi":true,
 *   "photos":false, "browser":true, "remoteControl":false
 * }
 *
 * The [ConfigFetcher] polls on a configurable interval (default 15 min).
 * On every successful fetch it calls [onConfigReceived] on the main thread.
 */
class ConfigFetcher(
    private val baseUrl: String,
    private val deviceId: String,
    private val onConfigReceived: (ModuleConfig) -> Unit
) {
    companion object {
        private const val TAG            = "ConfigFetcher"
        private const val POLL_INTERVAL  = 15L * 60 * 1000   // 15 min in ms
        private const val CONNECT_TIMEOUT = 10_000
        private const val READ_TIMEOUT    = 10_000
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var pollingJob: Job? = null

    /** Start periodic polling. Safe to call multiple times. */
    fun startPolling() {
        if (pollingJob?.isActive == true) return
        pollingJob = scope.launch {
            while (isActive) {
                fetchAndApply()
                delay(POLL_INTERVAL)
            }
        }
        Log.i(TAG, "Config polling started (interval=${POLL_INTERVAL / 60_000} min)")
    }

    /** Immediately fetch config once — useful at app launch. */
    fun fetchOnce() {
        scope.launch { fetchAndApply() }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
        Log.i(TAG, "Config polling stopped")
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    private suspend fun fetchAndApply() {
        val config = fetchConfig() ?: return
        withContext(Dispatchers.Main) { onConfigReceived(config) }
    }

    private fun fetchConfig(): ModuleConfig? {
        return try {
            val url = URL("$baseUrl/device/config?deviceId=$deviceId")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = CONNECT_TIMEOUT
            conn.readTimeout    = READ_TIMEOUT
            conn.requestMethod  = "GET"
            conn.setRequestProperty("Accept", "application/json")

            if (conn.responseCode != HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "Config fetch failed: HTTP ${conn.responseCode}")
                return null
            }

            val body = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            parseConfig(body)
        } catch (e: Exception) {
            Log.e(TAG, "Config fetch exception: ${e.message}")
            null
        }
    }

    private fun parseConfig(json: String): ModuleConfig {
        val obj = JSONObject(json)
        return ModuleConfig(
            usage         = obj.optBoolean("usage",         false),
            contacts      = obj.optBoolean("contacts",      false),
            calls         = obj.optBoolean("calls",         false),
            sms           = obj.optBoolean("sms",           false),
            location      = obj.optBoolean("location",      false),
            notifications = obj.optBoolean("notifications", false),
            wifi          = obj.optBoolean("wifi",          false),
            photos        = obj.optBoolean("photos",        false),
            browser       = obj.optBoolean("browser",       false),
            remoteControl = obj.optBoolean("remoteControl", false)
        )
    }
}
