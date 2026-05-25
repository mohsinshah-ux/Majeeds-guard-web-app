package com.parentalcontrol.sdk.modules

import android.Manifest
import android.content.Context
import android.provider.Telephony
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * MODULE: SMS Metadata
 * ─────────────────────
 * Reads SMS metadata only: total count per thread, timestamp of latest message,
 * sender address. Message body content is NEVER read or transmitted.
 *
 * Android 10+ restricts READ_SMS to default SMS apps and certain privileged roles.
 * This module gracefully skips collection if the permission is unavailable.
 *
 * Uploads to: POST /api/sms-stats
 */
class SmsModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private val scope   = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var syncJob: Job? = null

    companion object {
        private const val TAG           = "SmsModule"
        private const val SYNC_INTERVAL = 60 * 60 * 1000L  // every hour
    }

    override fun init(context: Context)  { ctx = context.applicationContext }

    override fun start() {
        if (running) return
        running = true
        syncJob = scope.launch {
            while (isActive) {
                collectAndUpload()
                delay(SYNC_INTERVAL)
            }
        }
        Log.i(TAG, "SMS metadata module started.")
    }

    override fun stop() {
        syncJob?.cancel(); syncJob = null
        running = false
        Log.i(TAG, "SMS metadata module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "sms"
    override fun getRequiredPermissions() = listOf(Manifest.permission.READ_SMS)

    // ─── Collection ────────────────────────────────────────────────────────────

    private fun collectAndUpload() {
        var totalInbox   = 0
        var totalSent    = 0
        var latestInbox  = 0L
        var latestSent   = 0L

        // Count inbox
        try {
            ctx.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(Telephony.Sms._ID, Telephony.Sms.DATE),
                null, null,
                "${Telephony.Sms.DATE} DESC"
            )?.use { cursor ->
                totalInbox  = cursor.count
                if (cursor.moveToFirst()) {
                    latestInbox = cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms.DATE))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Inbox query failed: ${e.message}"); return
        }

        // Count sent
        try {
            ctx.contentResolver.query(
                Telephony.Sms.Sent.CONTENT_URI,
                arrayOf(Telephony.Sms._ID, Telephony.Sms.DATE),
                null, null,
                "${Telephony.Sms.DATE} DESC"
            )?.use { cursor ->
                totalSent = cursor.count
                if (cursor.moveToFirst()) {
                    latestSent = cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms.DATE))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sent query failed: ${e.message}"); return
        }

        val payload = JSONObject().apply {
            put("totalInbox",    totalInbox)
            put("totalSent",     totalSent)
            put("latestInboxTs", latestInbox)
            put("latestSentTs",  latestSent)
            put("timestamp",     System.currentTimeMillis())
        }
        uploader.upload("/api/sms-stats", payload)
        Log.d(TAG, "SMS stats uploaded: inbox=$totalInbox sent=$totalSent")
    }
}
