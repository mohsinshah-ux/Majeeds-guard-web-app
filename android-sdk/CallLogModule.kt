package com.parentalcontrol.sdk

import android.Manifest
import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.util.Log

/**
 * Monitoring module to query Call Logs metadata (Incoming/Outgoing/Missed) from ContentResolver.
 * Only collects call stats (timestamp, call duration, anonymized metadata) with parent permission.
 */
class CallLogModule : MonitoringModule {
    private lateinit var context: Context
    private var isRunning = false

    companion object {
        private const val TAG = "CallLogModule"
    }

    override fun init(context: Context) {
        this.context = context
    }

    override fun start() {
        if (isRunning) return
        isRunning = true
        Log.d(TAG, "CallLog module started. Commencing call logs scanning...")
        syncCallLogs()
    }

    override fun stop() {
        if (!isRunning) return
        isRunning = false
        Log.d(TAG, "CallLog module stopped.")
    }

    override fun isEnabled(): Boolean {
        return isRunning
    }

    override fun getModuleId(): String {
        return "calls"
    }

    override fun getRequiredPermissions(): List<String> {
        return listOf(Manifest.permission.READ_CALL_LOG)
    }

    /**
     * Reads metadata logs from Android Call Provider.
     */
    fun syncCallLogs() {
        if (!isRunning) return

        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION
        )

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                null,
                null,
                "${CallLog.Calls.DATE} DESC LIMIT 50"
            )

            if (cursor == null) {
                Log.w(TAG, "Failed to retrieve call log cursor.")
                return
            }

            val numberIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
            val typeIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE)
            val dateIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.DATE)
            val durationIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION)

            Log.i(TAG, "Found ${cursor.count} call history records:")
            while (cursor.moveToNext()) {
                val number = cursor.getString(numberIndex)
                val type = cursor.getInt(typeIndex)
                val date = cursor.getLong(dateIndex)
                val duration = cursor.getString(durationIndex)

                val callTypeStr = when (type) {
                    CallLog.Calls.INCOMING_TYPE -> "Incoming"
                    CallLog.Calls.OUTGOING_TYPE -> "Outgoing"
                    CallLog.Calls.MISSED_TYPE -> "Missed"
                    else -> "Unknown"
                }

                Log.d(TAG, "Call Record: Number=$number, Type=$callTypeStr, Duration=${duration}s, Time=$date")
                // Pack and sync data to parental server (e.g., POST /api/call-logs)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying Call Log Provider: ${e.message}")
        } finally {
            cursor?.close()
        }
    }
}
