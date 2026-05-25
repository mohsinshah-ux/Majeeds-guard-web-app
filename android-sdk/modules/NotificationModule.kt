package com.parentalcontrol.sdk.modules

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import org.json.JSONObject

/**
 * MODULE: Activity Logs & Notifications
 * ───────────────────────────────────────
 * Intercepts STATUS-BAR-LEVEL notification metadata (app name, notification title,
 * posting timestamp) using NotificationListenerService.
 *
 * IMPORTANT:
 *  • Must be declared in AndroidManifest.xml as a <service> with
 *    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
 *  • User must grant "Notification Access" via Settings → Apps → Special App Access.
 *  • Only system-visible metadata is captured — no private message bodies from
 *    apps that mark their notifications as sensitive.
 *
 * Uploads to: POST /api/notifications
 */
class NotificationModule : NotificationListenerService(), MonitoringModule {

    private var running = false
    private lateinit var uploader: DataUploader

    companion object {
        private const val TAG = "NotificationModule"
        var instance: NotificationModule? = null  // set in onListenerConnected
    }

    // NotificationListenerService lifecycle
    override fun onListenerConnected() {
        instance = this
        Log.i(TAG, "NotificationListenerService connected.")
    }

    override fun onListenerDisconnected() {
        instance = null
        Log.i(TAG, "NotificationListenerService disconnected.")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!running) return
        val extras = sbn.notification?.extras ?: return

        // Skip notifications marked as secret/private by the originating app
        if (sbn.notification.visibility == Notification.VISIBILITY_SECRET) return

        val appPkg   = sbn.packageName
        val title    = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val postTime = sbn.postTime

        val payload = JSONObject().apply {
            put("appPackage", appPkg)
            put("title",      title)
            put("postTime",   postTime)
        }
        uploader.upload("/api/notifications", payload)
        Log.d(TAG, "Notification captured: [$appPkg] $title")
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) { /* no-op */ }

    // ─── MonitoringModule ──────────────────────────────────────────────────────

    fun setUploader(u: DataUploader)  { uploader = u }

    override fun init(context: Context) { /* context provided by Service */ }

    override fun start() {
        running = true
        Log.i(TAG, "Notification module activated.")
    }

    override fun stop() {
        running = false
        Log.i(TAG, "Notification module deactivated.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "notifications"
    override fun getRequiredPermissions() = listOf("android.permission.BIND_NOTIFICATION_LISTENER_SERVICE")
}
