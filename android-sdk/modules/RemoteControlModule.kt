package com.parentalcontrol.sdk.modules

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import org.json.JSONObject

/**
 * MODULE: Remote Control (Screen Time Limits, App Blocking, Device Lock)
 * ───────────────────────────────────────────────────────────────────────
 * Implements Device-Admin–backed remote control features.
 *
 * PREREQUISITES:
 *  1. The app must be provisioned as a Device Owner or Profile Owner.
 *  2. Parent must have explicitly consented and activated Device Admin during setup.
 *  3. DeviceAdminReceiver must be declared in AndroidManifest.xml.
 *
 * Features:
 *  • lockDevice()     — Immediately lock the screen (USES_POLICY_FORCE_LOCK)
 *  • setPasswordRules() — Enforce minimum PIN complexity
 *  • setAppRestriction() — Disable/enable specific apps (Profile Owner only)
 *
 * Uploads ACK to: POST /api/remote-commands/ack
 */
class RemoteControlModule(
    private val uploader: DataUploader,
    private val adminComponent: ComponentName  // your DeviceAdminReceiver class name
) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false

    companion object {
        private const val TAG = "RemoteControlModule"
    }

    override fun init(context: Context) { ctx = context.applicationContext }

    override fun start() {
        if (!isDeviceAdminActive()) {
            Log.w(TAG, "Device Admin not active — remote control unavailable. Guide parent to activate in Settings.")
            return
        }
        running = true
        Log.i(TAG, "Remote control module started.")
    }

    override fun stop() {
        running = false
        Log.i(TAG, "Remote control module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "remote_control"
    override fun getRequiredPermissions() = listOf("android.permission.BIND_DEVICE_ADMIN")

    // ─── Remote Command Handlers ───────────────────────────────────────────────

    /**
     * Immediately locks the device screen.
     * Requires USES_POLICY_FORCE_LOCK in device_admin.xml.
     */
    fun lockDevice(commandId: String) {
        if (!running) return
        try {
            val dpm = getDpm()
            dpm?.lockNow()
            ackCommand(commandId, "lock_device", "success")
            Log.i(TAG, "Device locked via remote command.")
        } catch (e: Exception) {
            ackCommand(commandId, "lock_device", "error: ${e.message}")
            Log.e(TAG, "Lock failed: ${e.message}")
        }
    }

    /**
     * Sets a maximum screen-off timeout (enforced screen-time limit).
     * This is a soft limit — supplement with UsageStatsManager app-blocking for full enforcement.
     * @param timeoutMs Maximum milliseconds before screen turns off. Use Int.MAX_VALUE to clear.
     */
    fun setScreenOffTimeout(commandId: String, timeoutMs: Int) {
        if (!running) return
        try {
            val dpm = getDpm()
            dpm?.setMaximumTimeToLock(adminComponent, timeoutMs.toLong())
            ackCommand(commandId, "set_screen_timeout", "success: ${timeoutMs}ms")
            Log.i(TAG, "Screen timeout set to ${timeoutMs}ms")
        } catch (e: Exception) {
            ackCommand(commandId, "set_screen_timeout", "error: ${e.message}")
            Log.e(TAG, "setScreenOffTimeout failed: ${e.message}")
        }
    }

    /**
     * Hides an application from the user (Profile Owner only).
     * Hidden apps cannot be launched by the user but are not uninstalled.
     */
    fun setAppHidden(commandId: String, packageName: String, hidden: Boolean) {
        if (!running) return
        try {
            val dpm = getDpm()
            val result = dpm?.setApplicationHidden(adminComponent, packageName, hidden)
            val status = if (result == true) "success" else "unsupported (requires Profile Owner)"
            ackCommand(commandId, "set_app_hidden", "$status pkg=$packageName hidden=$hidden")
            Log.i(TAG, "App $packageName hidden=$hidden result=$result")
        } catch (e: Exception) {
            ackCommand(commandId, "set_app_hidden", "error: ${e.message}")
            Log.e(TAG, "setAppHidden failed: ${e.message}")
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private fun getDpm(): DevicePolicyManager? =
        ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager

    private fun isDeviceAdminActive(): Boolean {
        val dpm = getDpm() ?: return false
        return dpm.isAdminActive(adminComponent)
    }

    private fun ackCommand(commandId: String, action: String, result: String) {
        uploader.upload("/api/remote-commands/ack", JSONObject().apply {
            put("commandId", commandId)
            put("action",    action)
            put("result",    result)
            put("timestamp", System.currentTimeMillis())
        })
    }
}
