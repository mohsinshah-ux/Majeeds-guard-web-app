package com.example.kidsguardchild.modules

import android.util.Log

/** Allows InitialSyncManager to trigger a dump of active notifications. */
object NotificationSyncBridge {
    private const val TAG = "NotificationSyncBridge"
    @Volatile
    var listener: NotificationModule? = null

    fun requestHistoricalSync() {
        val module = listener
        if (module == null) {
            Log.w(TAG, "Notification listener not connected — enable notification access")
            return
        }
        module.syncActiveNotifications()
    }
}
