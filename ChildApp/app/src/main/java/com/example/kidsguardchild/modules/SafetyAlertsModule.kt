package com.example.kidsguardchild.modules

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.SafetyAlertBody
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private const val TAG = "SafetyAlertsModule"

/**
 * Triggers safety alerts for:
 *  1. App installs / uninstalls (PackageReceiver — manifest registered)
 *  2. Low battery warnings (triggered when level drops below 15%)
 *  3. Suspicious activity (parental control app removal attempt)
 */
class SafetyAlertsModule(private val context: Context) {

    private var lastBatteryLevel = 100

    fun start() {
        Log.d(TAG, "SafetyAlerts module started (manifest receivers active)")
    }

    fun stop() {
        Log.d(TAG, "SafetyAlerts module stopped")
    }

    /** Call this periodically from the foreground service (e.g., every 5 minutes) */
    fun checkBattery() {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager ?: return
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

        // Alert only when crossing below 15% threshold
        if (level < 15 && lastBatteryLevel >= 15) {
            CoroutineScope(Dispatchers.IO).launch {
                DataUploader.upload("SafetyAlert[Battery]") {
                    ApiClient.service.postSafetyAlert(
                        SafetyAlertBody(
                            type = "Battery",
                            severity = "Warning",
                            msg = "Device battery critical: $level%"
                        )
                    )
                }
            }
        }
        lastBatteryLevel = level
    }

    /** Manifest-registered receiver for package installs / removals */
    class PackageReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val pkg = intent.data?.schemeSpecificPart ?: return
            val action = intent.action ?: return

            val (type, severity, msg) = when (action) {
                Intent.ACTION_PACKAGE_ADDED ->
                    Triple("AppInstall", "Info", "New app installed: $pkg")
                Intent.ACTION_PACKAGE_REMOVED ->
                    Triple("AppRemoved", "Warning", "App removed: $pkg")
                else -> return
            }

            Log.d(TAG, "Package event: $msg")

            // Alert if the parental control app itself is removed
            val finalSeverity = if (pkg == context.packageName && action == Intent.ACTION_PACKAGE_REMOVED)
                "Danger" else severity
            val finalMsg = if (pkg == context.packageName && action == Intent.ACTION_PACKAGE_REMOVED)
                "⚠️ CRITICAL: KidsGuard monitoring app uninstalled!" else msg

            CoroutineScope(Dispatchers.IO).launch {
                DataUploader.upload("SafetyAlert[$type]") {
                    ApiClient.service.postSafetyAlert(
                        SafetyAlertBody(type = type, severity = finalSeverity, msg = finalMsg)
                    )
                }
            }
        }
    }
}
