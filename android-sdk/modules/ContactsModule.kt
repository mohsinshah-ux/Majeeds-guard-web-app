package com.parentalcontrol.sdk.modules

import android.Manifest
import android.content.Context
import android.provider.ContactsContract
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * MODULE: Most-Contacted Contacts (7-day window)
 * ────────────────────────────────────────────────
 * Joins ContactsContract.Data (TIMES_CONTACTED) with the Contacts provider
 * to surface the top N contacts the child has interacted with most in the last 7 days.
 *
 * Only metadata (display name, normalised phone number, interaction count) is collected.
 * Message content is NEVER accessed.
 *
 * Data uploaded to: POST /api/contacts
 */
class ContactsModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private val scope   = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var syncJob: Job? = null

    companion object {
        private const val TAG           = "ContactsModule"
        private const val SYNC_INTERVAL = 60 * 60 * 1000L   // once per hour
        private const val TOP_N         = 20
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
        Log.i(TAG, "Contacts module started.")
    }

    override fun stop() {
        syncJob?.cancel(); syncJob = null
        running = false
        Log.i(TAG, "Contacts module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "contacts"
    override fun getRequiredPermissions() = listOf(Manifest.permission.READ_CONTACTS)

    // ─── Collection ────────────────────────────────────────────────────────────

    private fun collectAndUpload() {
        val contacts = queryTopContacts()
        if (contacts.isEmpty()) return

        val arr = JSONArray()
        contacts.forEach { (name, number, times) ->
            arr.put(JSONObject().apply {
                put("displayName",    name)
                put("normalizedPhone", number)
                put("timesContacted", times)
            })
        }

        uploader.upload("/api/contacts", JSONObject().apply {
            put("period",    "7d")
            put("contacts",  arr)
            put("timestamp", System.currentTimeMillis())
        })
        Log.d(TAG, "Contacts uploaded: ${contacts.size} records.")
    }

    private fun queryTopContacts(): List<Triple<String, String, Int>> {
        val results = mutableListOf<Triple<String, String, Int>>()
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NORMALIZED_NUMBER,
            ContactsContract.CommonDataKinds.Phone.TIMES_CONTACTED
        )
        val cursor = try {
            ctx.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                projection,
                null, null,
                "${ContactsContract.CommonDataKinds.Phone.TIMES_CONTACTED} DESC LIMIT $TOP_N"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Query error: ${e.message}"); return results
        }

        cursor?.use {
            val nameIdx   = it.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numIdx    = it.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NORMALIZED_NUMBER)
            val timesIdx  = it.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.TIMES_CONTACTED)
            while (it.moveToNext()) {
                results += Triple(
                    it.getString(nameIdx)  ?: "Unknown",
                    it.getString(numIdx)   ?: "",
                    it.getInt(timesIdx)
                )
            }
        }
        return results
    }
}
