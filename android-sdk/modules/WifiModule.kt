package com.parentalcontrol.sdk.modules

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import org.json.JSONObject

/**
 * MODULE: Wi-Fi Network Monitoring
 * ──────────────────────────────────
 * Tracks network connectivity transitions (connected/disconnected) and
 * records SSID and signal strength whenever Wi-Fi state changes.
 *
 * Requires:  ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE
 *            (both normal permissions — no runtime grant dialog needed)
 *
 * Uploads to: POST /api/wifi-logs
 */
class WifiModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    companion object {
        private const val TAG = "WifiModule"
    }

    override fun init(context: Context)  { ctx = context.applicationContext }

    override fun start() {
        if (running) return

        val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val req = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                logWifiEvent("connected")
            }
            override fun onLost(network: Network) {
                logWifiEvent("disconnected")
            }
        }

        cm.registerNetworkCallback(req, networkCallback!!)
        running = true
        Log.i(TAG, "Wi-Fi module started.")
    }

    override fun stop() {
        if (!running) return
        try {
            val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            networkCallback?.let { cm.unregisterNetworkCallback(it) }
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering network callback: ${e.message}")
        }
        networkCallback = null
        running = false
        Log.i(TAG, "Wi-Fi module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "wifi"
    override fun getRequiredPermissions() = listOf(
        android.Manifest.permission.ACCESS_NETWORK_STATE,
        android.Manifest.permission.ACCESS_WIFI_STATE
    )

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private fun logWifiEvent(event: String) {
        val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val info = wm?.connectionInfo
        val payload = JSONObject().apply {
            put("event",      event)
            put("ssid",       info?.ssid ?: "unknown")
            put("rssi",       info?.rssi ?: 0)
            put("timestamp",  System.currentTimeMillis())
        }
        uploader.upload("/api/wifi-logs", payload)
        Log.d(TAG, "Wi-Fi event: $event  SSID=${info?.ssid}")
    }
}
