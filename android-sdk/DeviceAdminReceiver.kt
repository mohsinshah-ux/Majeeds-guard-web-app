package com.parentalcontrol.sdk

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * DeviceAdminReceiver
 * ────────────────────
 * Receives Device Admin lifecycle events.
 * Must be referenced in AndroidManifest.xml and in res/xml/device_admin.xml.
 *
 * The parent enables Device Admin during the on-boarding setup flow by navigating
 * to Settings → Security → Device Admin Apps and activating this app.
 */
class DeviceAdminReceiver : DeviceAdminReceiver() {
    companion object {
        private const val TAG = "DeviceAdminReceiver"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        Log.i(TAG, "Device Admin activated by user.")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Log.w(TAG, "Device Admin deactivated — remote control features disabled.")
    }

    override fun onPasswordChanged(context: Context, intent: Intent) {
        Log.d(TAG, "Device password changed.")
    }
}
