package com.parentalcontrol.sdk.modules

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import org.json.JSONObject

/**
 * MODULE: Device Safety Alerts
 * ─────────────────────────────
 * Monitors and reports:
 *  1. Low battery threshold (< 15 %)
 *  2. New app install events (PACKAGE_ADDED broadcast)
 *  3. App removal events (PACKAGE_REMOVED broadcast)
 *
 * No special permissions required — uses normal manifest-declared broadcasts.
 * Uploads to: POST /api/safety-alerts
 */
class SafetyAlertsModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private var packageReceiver: BroadcastReceiver? = null
    private var batteryReceiver: BroadcastReceiver? = null

    companion object {
        private const val TAG             = "SafetyAlertsModule"
        private const val LOW_BATTERY_PCT = 15
    }

    override fun init(context: Context)  { ctx = context.applicationContext }

    override fun start() {
        if (running) return

        // ── Package install/remove monitor ─────────────────────────────────────
        packageReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val pkg = intent.data?.schemeSpecificPart ?: return
                when (intent.action) {
                    Intent.ACTION_PACKAGE_ADDED -> {
                        val isUpdate = intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)
                        if (!isUpdate) reportAlert("app_installed", "New app installed: $pkg", pkg)
                    }
                    Intent.ACTION_PACKAGE_REMOVED -> {
                        val isUpdate = intent.getBooleanExtra(Intent.EXTRA_REPLACING, false)
                        if (!isUpdate) reportAlert("app_removed", "App removed: $pkg", pkg)
                    }
                }
            }
        }
        val pkgFilter = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED)
            addAction(Intent.ACTION_PACKAGE_REMOVED)
            addDataScheme("package")
        }
        ctx.registerReceiver(packageReceiver, pkgFilter)

        // ── Battery level monitor ──────────────────────────────────────────────
        batteryReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
                val pct   = if (scale > 0) (level * 100 / scale) else -1
                if (pct in 0 until LOW_BATTERY_PCT) {
                    reportAlert("low_battery", "Battery at $pct%", "")
                }
            }
        }
        ctx.registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))

        running = true
        Log.i(TAG, "Safety alerts module started.")
    }

    override fun stop() {
        if (!running) return
        packageReceiver?.let { ctx.unregisterReceiver(it) }
        batteryReceiver?.let { ctx.unregisterReceiver(it) }
        packageReceiver = null; batteryReceiver = null
        running = false
        Log.i(TAG, "Safety alerts module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "safety_alerts"
    override fun getRequiredPermissions() = emptyList<String>()

    // ─── Internal ──────────────────────────────────────────────────────────────

    private fun reportAlert(type: String, message: String, packageName: String) {
        val payload = JSONObject().apply {
            put("alertType",   type)
            put("message",     message)
            put("packageName", packageName)
            put("timestamp",   System.currentTimeMillis())
        }
        uploader.upload("/api/safety-alerts", payload)
        Log.i(TAG, "Safety alert reported: [$type] $message")
    }
}
