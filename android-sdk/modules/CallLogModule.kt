package com.parentalcontrol.sdk.modules

import android.Manifest
import android.content.Context
import android.provider.CallLog
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * MODULE: Call Log Metadata
 * ─────────────────────────
 * Syncs recent call history metadata (number, type, duration, timestamp).
 * Audio content is NEVER recorded or accessed.
 * Uploads to: POST /api/call-logs
 */
class CallLogModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private val scope   = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var syncJob: Job? = null

    companion object {
        private const val TAG           = "CallLogModule"
        private const val SYNC_INTERVAL = 30 * 60 * 1000L  // every 30 min
        private const val FETCH_LIMIT   = 100
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
        Log.i(TAG, "CallLog module started.")
    }

    override fun stop() {
        syncJob?.cancel(); syncJob = null
        running = false
        Log.i(TAG, "CallLog module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "calls"
    override fun getRequiredPermissions() = listOf(Manifest.permission.READ_CALL_LOG)

    // ─── Collection ────────────────────────────────────────────────────────────

    private fun collectAndUpload() {
        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION
        )
        val arr = JSONArray()

        try {
            ctx.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                null, null,
                "${CallLog.Calls.DATE} DESC LIMIT $FETCH_LIMIT"
            )?.use { cursor ->
                val numIdx  = cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
                val typeIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE)
                val dateIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.DATE)
                val durIdx  = cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION)

                while (cursor.moveToNext()) {
                    val type = when (cursor.getInt(typeIdx)) {
                        CallLog.Calls.INCOMING_TYPE -> "incoming"
                        CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                        CallLog.Calls.MISSED_TYPE   -> "missed"
                        else                        -> "unknown"
                    }
                    arr.put(JSONObject().apply {
                        put("number",     cursor.getString(numIdx) ?: "")
                        put("type",       type)
                        put("date",       cursor.getLong(dateIdx))
                        put("durationSec",cursor.getInt(durIdx))
                    })
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Query error: ${e.message}"); return
        }

        if (arr.length() > 0) {
            uploader.upload("/api/call-logs", JSONObject().apply {
                put("calls",     arr)
                put("timestamp", System.currentTimeMillis())
            })
            Log.d(TAG, "Uploaded ${arr.length()} call records.")
        }
    }
}
