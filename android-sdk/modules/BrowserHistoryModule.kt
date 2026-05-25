package com.parentalcontrol.sdk.modules

import android.Manifest
import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * MODULE: Browser History (System Browser Only)
 * ─────────────────────────────────────────────
 * Reads browser history from the default system browser via the
 * android.provider.Browser.BOOKMARKS_URI content provider.
 *
 * Limitations:
 *  • Only works for AOSP/stock browser on Android ≤ 5.x by default.
 *  • Modern Android versions (6+) restrict cross-app browser history access;
 *    this module will return empty results unless the device OEM browser
 *    still exposes the provider, or the app is set as the default browser.
 *  • Chrome and other third-party browsers do NOT expose their history via
 *    ContentProvider — this is by Android OS design.
 *
 * Recommended production alternative: build an in-app parental browser that
 * records history internally and uploads to the dashboard.
 *
 * Uploads to: POST /api/browser-history
 */
@Suppress("DEPRECATION")
class BrowserHistoryModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private val scope   = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var syncJob: Job? = null

    companion object {
        private const val TAG           = "BrowserHistoryModule"
        private const val SYNC_INTERVAL = 60 * 60 * 1000L  // every hour
        private const val FETCH_LIMIT   = 50

        // AOSP browser history provider (deprecated on modern OS versions)
        private val BROWSER_URI: Uri = Uri.parse("content://browser/bookmarks")
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
        Log.i(TAG, "Browser history module started.")
    }

    override fun stop() {
        syncJob?.cancel(); syncJob = null
        running = false
        Log.i(TAG, "Browser history module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "browser"
    override fun getRequiredPermissions() = listOf(Manifest.permission.READ_HISTORY_BOOKMARKS)

    // ─── Collection ────────────────────────────────────────────────────────────

    private fun collectAndUpload() {
        val arr = JSONArray()
        try {
            ctx.contentResolver.query(
                BROWSER_URI,
                arrayOf("url", "title", "date", "visits"),
                "bookmark = 0",
                null,
                "date DESC LIMIT $FETCH_LIMIT"
            )?.use { cursor ->
                while (cursor.moveToNext()) {
                    arr.put(JSONObject().apply {
                        put("url",    cursor.getString(0) ?: "")
                        put("title",  cursor.getString(1) ?: "")
                        put("date",   cursor.getLong(2))
                        put("visits", cursor.getInt(3))
                    })
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Browser history not accessible on this device/OS: ${e.message}")
            return
        }

        if (arr.length() > 0) {
            uploader.upload("/api/browser-history", JSONObject().apply {
                put("entries",   arr)
                put("timestamp", System.currentTimeMillis())
            })
            Log.d(TAG, "Browser history uploaded: ${arr.length()} entries.")
        } else {
            Log.d(TAG, "No browser history available (expected on Android 6+).")
        }
    }
}
