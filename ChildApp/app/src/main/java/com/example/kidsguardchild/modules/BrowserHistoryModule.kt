package com.example.kidsguardchild.modules

import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.BrowserHistoryBody
import com.example.kidsguardchild.core.DataUploader
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

private const val TAG = "BrowserHistoryModule"

/**
 * Reads browser history/bookmarks from the AOSP browser content provider.
 * Note: On Android 6+ most browsers (Chrome, Firefox) no longer expose
 * history via content providers, so this only works for the AOSP stock browser
 * or Samsung Internet with accessibility enabled.
 *
 * For modern browsers, parental monitoring should use a DNS/VPN-based approach
 * or a dedicated parental browser app.
 */
class BrowserHistoryModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null
    private var lastUploadTime = System.currentTimeMillis() - TimeUnit.HOURS.toMillis(1)

    @Suppress("DEPRECATION")
    private val browserHistoryUri: Uri = Uri.parse("content://browser/bookmarks")

    fun start() {
        job = scope.launch {
            syncHistorical()
            while (isActive) {
                uploadBrowserHistory()
                lastUploadTime = System.currentTimeMillis()
                delay(TimeUnit.MINUTES.toMillis(20))
            }
        }
        Log.d(TAG, "BrowserHistory module started")
    }

    suspend fun syncHistorical() {
        lastUploadTime = 0
        uploadBrowserHistory(100)
        Log.i(TAG, "Historical browser sync attempted")
    }

    fun stop() {
        job?.cancel()
        Log.d(TAG, "BrowserHistory module stopped")
    }

    private suspend fun uploadBrowserHistory(maxCount: Int = 30) {
        val projection = arrayOf("title", "url", "date")
        val selection = "date > ? AND bookmark = 0"
        val selectionArgs = arrayOf(lastUploadTime.toString())

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                browserHistoryUri,
                projection,
                selection,
                selectionArgs,
                "date DESC"
            )

            cursor?.use { c ->
                var count = 0
                while (c.moveToNext() && count < maxCount) {
                    val title = c.getString(c.getColumnIndexOrThrow("title")) ?: ""
                    val url = c.getString(c.getColumnIndexOrThrow("url")) ?: ""

                    if (url.isNotBlank()) {
                        DataUploader.upload("Browser[$title]") {
                            ApiClient.service.postBrowserHistory(
                                BrowserHistoryBody(query = title, url = url)
                            )
                        }
                        count++
                    }
                }
                Log.d(TAG, "Uploaded $count browser history entries")
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "Browser history access denied (expected on modern Android): ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error reading browser history: ${e.message}")
        } finally {
            cursor?.close()
        }
    }
}
