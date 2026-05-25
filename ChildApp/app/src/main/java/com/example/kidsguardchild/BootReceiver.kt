package com.example.kidsguardchild

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

private const val TAG = "BootReceiver"

/**
 * Restarts the ParentalControlService after device reboot or app update.
 * Registered in AndroidManifest for BOOT_COMPLETED and MY_PACKAGE_REPLACED.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.d(TAG, "Boot/Update received — restarting ParentalControlService")

            // Check if the device is paired (server URL saved in prefs)
            val prefs = context.getSharedPreferences("kidsguard_prefs", Context.MODE_PRIVATE)
            val serverUrl = prefs.getString("server_url", null)
            if (serverUrl.isNullOrBlank()) {
                Log.d(TAG, "No server URL configured — skipping service start")
                return
            }

            val serviceIntent = Intent(context, ParentalControlService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
