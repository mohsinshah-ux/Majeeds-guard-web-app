package com.parentalcontrol.sdk.modules

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * MODULE: Installed Apps Inventory
 * ──────────────────────────────────
 * Periodically syncs the list of user-installed applications on the device.
 * Provides parents with visibility into what applications are installed.
 * System apps are excluded by default to reduce noise.
 *
 * Uploads to: POST /api/installed-apps
 */
class InstalledAppsModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private val scope   = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var syncJob: Job? = null

    companion object {
        private const val TAG           = "InstalledAppsModule"
        private const val SYNC_INTERVAL = 6 * 60 * 60 * 1000L  // every 6 hours
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
        Log.i(TAG, "Installed apps module started.")
    }

    override fun stop() {
        syncJob?.cancel(); syncJob = null
        running = false
        Log.i(TAG, "Installed apps module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "installed_apps"
    override fun getRequiredPermissions() = emptyList<String>()  // uses PackageManager — no runtime permission

    // ─── Collection ────────────────────────────────────────────────────────────

    private fun collectAndUpload() {
        val pm   = ctx.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { (it.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0 }  // user-installed only

        val arr = JSONArray()
        apps.forEach { info ->
            arr.put(JSONObject().apply {
                put("packageName", info.packageName)
                put("appLabel",    pm.getApplicationLabel(info).toString())
            })
        }

        if (arr.length() > 0) {
            uploader.upload("/api/installed-apps", JSONObject().apply {
                put("count",     arr.length())
                put("apps",      arr)
                put("timestamp", System.currentTimeMillis())
            })
            Log.d(TAG, "Installed apps uploaded: ${arr.length()} user apps.")
        }
    }
}
