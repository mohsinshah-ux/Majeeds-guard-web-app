package com.example.kidsguardchild.core

import android.content.Context
import com.example.kidsguardchild.R

/**
 * Child account profile stored locally and shown on the Account tab.
 */
object AccountPrefs {

    const val PREFS_NAME = "kidsguard_prefs"

    const val KEY_DISPLAY_NAME = "account_display_name"
    const val KEY_FULL_NAME = "account_full_name"
    const val KEY_PHONE = "account_phone"
    const val KEY_EMAIL = "account_email"
    const val KEY_SCHOOL = "account_school"
    const val KEY_NOTES = "account_notes"
    const val KEY_PAIRED_AT = "account_paired_at"

    data class AccountDetails(
        val displayName: String,
        val fullName: String,
        val phone: String,
        val email: String,
        val school: String,
        val notes: String,
        val serverUrl: String,
        val deviceId: String,
        val pairedAt: String
    )

    fun load(context: Context): AccountDetails {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val deviceId = prefs.getString("device_id", null)
            ?: prefs.getString("device_token", "") ?: ""
        val serverUrl = prefs.getString("server_url", "") ?: ""
        val displayFallback = prefs.getString(KEY_DISPLAY_NAME, null)
            ?: prefs.getString("device_label", null)
            ?: "Child Device"
        return AccountDetails(
            displayName = displayFallback,
            fullName = prefs.getString(KEY_FULL_NAME, "") ?: "",
            phone = prefs.getString(KEY_PHONE, "") ?: "",
            email = prefs.getString(KEY_EMAIL, "") ?: "",
            school = prefs.getString(KEY_SCHOOL, "") ?: "",
            notes = prefs.getString(KEY_NOTES, "") ?: "",
            serverUrl = serverUrl,
            deviceId = deviceId,
            pairedAt = prefs.getString(KEY_PAIRED_AT, "—") ?: "—"
        )
    }

    fun saveDisplayName(context: Context, value: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_DISPLAY_NAME, value.trim())
            .apply()
    }

    fun saveFullName(context: Context, value: String) {
        save(context, KEY_FULL_NAME, value)
    }

    fun savePhone(context: Context, value: String) {
        save(context, KEY_PHONE, value)
    }

    fun saveEmail(context: Context, value: String) {
        save(context, KEY_EMAIL, value)
    }

    fun saveSchool(context: Context, value: String) {
        save(context, KEY_SCHOOL, value)
    }

    fun saveNotes(context: Context, value: String) {
        save(context, KEY_NOTES, value)
    }

    fun saveServerUrl(context: Context, value: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString("server_url", value.trim())
            .apply()
    }

    fun markPaired(context: Context, displayName: String) {
        val now = java.text.SimpleDateFormat(
            "yyyy-MM-dd HH:mm",
            java.util.Locale.getDefault()
        ).format(java.util.Date())
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_DISPLAY_NAME, displayName.trim().ifBlank { "Child Device" })
            .putString(KEY_PAIRED_AT, now)
            .apply()
    }

    private fun save(context: Context, key: String, value: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(key, value.trim())
            .apply()
    }

    /** Clears pairing session — user must pair again. */
    fun clearSession(context: Context) {
        val defaultUrl = context.getString(R.string.default_server_url)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove("is_paired")
            .remove("device_id")
            .remove("device_token")
            .remove(KEY_DISPLAY_NAME)
            .remove(KEY_FULL_NAME)
            .remove(KEY_PHONE)
            .remove(KEY_EMAIL)
            .remove(KEY_SCHOOL)
            .remove(KEY_NOTES)
            .remove(KEY_PAIRED_AT)
            .putString("server_url", defaultUrl)
            .apply()
    }
}
