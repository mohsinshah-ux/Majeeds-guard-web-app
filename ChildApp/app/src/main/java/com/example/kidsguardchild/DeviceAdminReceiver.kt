package com.example.kidsguardchild

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

private const val TAG = "DeviceAdminReceiver"

/**
 * Device Admin lifecycle callbacks.
 * Required for DevicePolicyManager features (lockNow, screen timeout, wipe).
 * The user must manually enable this via Settings > Security > Device Admin.
 */
class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        Log.d(TAG, "Device Admin ENABLED")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Log.w(TAG, "⚠️ Device Admin DISABLED — remote lock/wipe will not work")
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "Disabling Device Admin will prevent your parent from remotely managing this device. Are you sure?"
    }
}
