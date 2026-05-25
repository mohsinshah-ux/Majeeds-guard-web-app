package com.parentalcontrol.sdk.modules

import android.Manifest
import android.content.Context
import android.provider.MediaStore
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * MODULE: Photos & Media Access
 * ──────────────────────────────
 * Reads metadata from the device MediaStore:
 *  - Image count and most recent capture date
 *  - Video count and most recent capture date
 *
 * Does NOT upload, stream, or transmit actual image/video bytes.
 * Full access only after the parent explicitly grants READ_MEDIA_IMAGES/VIDEO.
 *
 * Uploads to: POST /api/media-stats
 */
class PhotosModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private val scope   = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var syncJob: Job? = null

    companion object {
        private const val TAG           = "PhotosModule"
        private const val SYNC_INTERVAL = 12 * 60 * 60 * 1000L  // every 12 hours
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
        Log.i(TAG, "Photos module started.")
    }

    override fun stop() {
        syncJob?.cancel(); syncJob = null
        running = false
        Log.i(TAG, "Photos module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "photos"
    override fun getRequiredPermissions() = if (android.os.Build.VERSION.SDK_INT >= 33)
        listOf(
            Manifest.permission.READ_MEDIA_IMAGES,
            Manifest.permission.READ_MEDIA_VIDEO
        )
    else
        listOf(Manifest.permission.READ_EXTERNAL_STORAGE)

    // ─── Collection ────────────────────────────────────────────────────────────

    private fun collectAndUpload() {
        val imageStats = queryMediaStats(MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        val videoStats = queryMediaStats(MediaStore.Video.Media.EXTERNAL_CONTENT_URI)

        val payload = JSONObject().apply {
            put("imageCount",       imageStats.first)
            put("latestImageDate",  imageStats.second)
            put("videoCount",       videoStats.first)
            put("latestVideoDate",  videoStats.second)
            put("timestamp",        System.currentTimeMillis())
        }
        uploader.upload("/api/media-stats", payload)
        Log.d(TAG, "Media stats uploaded: images=${imageStats.first}, videos=${videoStats.first}")
    }

    /** Returns (count, latestDateAdded). */
    private fun queryMediaStats(uri: android.net.Uri): Pair<Int, Long> {
        var count      = 0
        var latestDate = 0L
        try {
            ctx.contentResolver.query(
                uri,
                arrayOf(MediaStore.MediaColumns.DATE_ADDED),
                null, null,
                "${MediaStore.MediaColumns.DATE_ADDED} DESC"
            )?.use { cursor ->
                count = cursor.count
                if (cursor.moveToFirst()) {
                    latestDate = cursor.getLong(0)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "MediaStore query error: ${e.message}")
        }
        return Pair(count, latestDate)
    }
}
