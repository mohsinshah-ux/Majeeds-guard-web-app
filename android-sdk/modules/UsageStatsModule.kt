package com.parentalcontrol.sdk.modules

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import android.util.Log
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.*

/**
 * MODULE: App Usage Statistics & Screen Time
 * ──────────────────────────────────────────
 * Reads foreground usage time per app for the last 24 hours using Android's
 * UsageStatsManager (requires "Usage Access" special permission granted via
 * Settings → Apps → Special App Access → Usage Access).
 *
 * Data uploaded to: POST /api/usage-stats
 *
 * Derived insights available in dashboard:
 *  • Most-used apps today
 *  • Total screen time today
 *  • 7-day usage trends (call collectWeeklyStats())
 */
class UsageStatsModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private var running = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var syncJob: Job? = null

    companion object {
        private const val TAG           = "UsageStatsModule"
        private const val SYNC_INTERVAL = 30 * 60 * 1000L  // every 30 minutes
    }

    override fun init(context: Context) { ctx = context.applicationContext }

    override fun start() {
        if (running) return
        if (!hasUsageAccess()) {
            Log.w(TAG, "Usage Access permission not granted. Skipping start.")
            return
        }
        running = true
        syncJob = scope.launch {
            while (isActive) {
                collectAndUploadDaily()
                delay(SYNC_INTERVAL)
            }
        }
        Log.i(TAG, "UsageStats module started.")
    }

    override fun stop() {
        syncJob?.cancel()
        syncJob = null
        running = false
        Log.i(TAG, "UsageStats module stopped.")
    }

    override fun isEnabled()              = running
    override fun getModuleId()            = "usage_stats"
    override fun getRequiredPermissions() = listOf("android.permission.PACKAGE_USAGE_STATS")

    // ─── Collection ────────────────────────────────────────────────────────────

    /** Collect today's stats and upload as a batch. */
    fun collectAndUploadDaily() {
        val stats = queryUsageStats(hours = 24) ?: return
        val arr = JSONArray()
        stats.filter { it.totalTimeInForeground > 0 }.forEach { s ->
            arr.put(JSONObject().apply {
                put("package",    s.packageName)
                put("foregroundMs", s.totalTimeInForeground)
                put("lastUsed",   s.lastTimeUsed)
            })
        }
        if (arr.length() > 0) {
            uploader.upload("/api/usage-stats", JSONObject().apply {
                put("period", "24h")
                put("apps", arr)
                put("timestamp", System.currentTimeMillis())
            })
            Log.d(TAG, "Uploaded usage stats for ${arr.length()} apps.")
        }
    }

    /** 7-day aggregate — call on-demand for weekly report generation. */
    fun collectWeeklyStats(): List<UsageStats> =
        queryUsageStats(hours = 7 * 24) ?: emptyList()

    // ─── Internal ──────────────────────────────────────────────────────────────

    private fun queryUsageStats(hours: Int): List<UsageStats>? {
        val mgr = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val end   = System.currentTimeMillis()
        val start = end - hours * 60 * 60 * 1000L
        val stats = mgr.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
        if (stats.isNullOrEmpty()) {
            Log.w(TAG, "No usage statistics returned — user may not have granted Usage Access.")
            return null
        }
        return stats
    }

    private fun hasUsageAccess(): Boolean {
        val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode   = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            ctx.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }
}
