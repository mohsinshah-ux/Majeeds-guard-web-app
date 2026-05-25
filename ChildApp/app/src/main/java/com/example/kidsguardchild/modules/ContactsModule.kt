package com.example.kidsguardchild.modules

import android.content.Context
import android.database.Cursor
import android.provider.ContactsContract
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.ContactBody
import com.example.kidsguardchild.core.DataUploader
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

private const val TAG = "ContactsModule"

/**
 * Syncs device contacts to the parent dashboard every hour.
 * Determines "most contacted" by cross-referencing call log frequencies.
 * Requires: READ_CONTACTS permission.
 */
class ContactsModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null

    fun start() {
        job = scope.launch {
            uploadContactsOnce()
            while (isActive) {
                delay(TimeUnit.MINUTES.toMillis(30))
                uploadContactsOnce()
            }
        }
        Log.d(TAG, "Contacts module started")
    }

    suspend fun uploadContactsOnce() {
        uploadContacts()
    }

    fun stop() {
        job?.cancel()
        Log.d(TAG, "Contacts module stopped")
    }

    private suspend fun uploadContacts() {
        val projection = arrayOf(
            ContactsContract.Contacts._ID,
            ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
            ContactsContract.Contacts.HAS_PHONE_NUMBER
        )

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                ContactsContract.Contacts.CONTENT_URI,
                projection,
                null, null,
                "${ContactsContract.Contacts.DISPLAY_NAME_PRIMARY} ASC"
            )

            cursor?.use { c ->
                while (c.moveToNext()) {
                    val id = c.getString(c.getColumnIndexOrThrow(ContactsContract.Contacts._ID))
                    val name = c.getString(c.getColumnIndexOrThrow(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY)) ?: "Unknown"
                    val hasPhone = c.getInt(c.getColumnIndexOrThrow(ContactsContract.Contacts.HAS_PHONE_NUMBER))

                    var phone = ""
                    var email = ""

                    if (hasPhone > 0) {
                        phone = getPhone(id) ?: ""
                    }
                    email = getEmail(id) ?: ""

                    DataUploader.upload("Contact[$name]") {
                        ApiClient.service.postContact(
                            ContactBody(name = name, phone = phone, mail = email)
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading contacts: ${e.message}")
        } finally {
            cursor?.close()
        }
    }

    private fun getPhone(contactId: String): String? {
        val cursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
            "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
            arrayOf(contactId), null
        )
        return cursor?.use {
            if (it.moveToFirst()) it.getString(0) else null
        }
    }

    private fun getEmail(contactId: String): String? {
        val cursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Email.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Email.ADDRESS),
            "${ContactsContract.CommonDataKinds.Email.CONTACT_ID} = ?",
            arrayOf(contactId), null
        )
        return cursor?.use {
            if (it.moveToFirst()) it.getString(0) else null
        }
    }
}
