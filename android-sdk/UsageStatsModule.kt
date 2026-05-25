package com.parentalcontrol.sdk

import android.app.usage.UsageStatsManager
import android.content.Context
import android.util.Log
import java.util.*

/**
 * Monitoring module to collect application usage statistics and calculate screen time.
 * Requires the user to grant Usage Access settings permission (PACKAGE_USAGE_STATS).
 */
class UsageStatsModule : MonitoringModule {
    private lateinit var context: Context
    private var isRunning = false

    companion object {
        private const val TAG = "UsageStatsModule"
    }

    override fun init(context: Context) {
        this.context = context
    }

    override fun start() {
        if (isRunning) return
        isRunning = true
        Log.d(TAG, "UsageStats module started. Commencing telemetry collections...")
        collectDailyUsageStats()
    }

    override fun stop() {
        if (!isRunning) return
        isRunning = false
        Log.d(TAG, "UsageStats module stopped.")
    }

    override fun isEnabled(): Boolean {
        return isRunning
    }

    override fun getModuleId(): String {
        return "usage_stats"
    }

    override fun getRequiredPermissions(): List<String> {
        // PACKAGE_USAGE_STATS is a Special App Access permission, not a regular runtime permission.
        // It must be declared in AndroidManifest.xml and checked at runtime using AppOpsManager.
        return listOf("android.permission.PACKAGE_USAGE_STATS")
    }

    /**
     * Reads application stats from the system UsageStatsManager for the last 24 hours.
     */
    fun collectDailyUsageStats() {
        if (!isRunning) return

        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
        if (usageStatsManager == null) {
            Log.e(TAG, "UsageStatsManager service is not available on this device.")
            return
        }

        val calendar = Calendar.getInstance()
        val endTime = calendar.timeInMillis
        calendar.add(Calendar.DAY_OF_YEAR, -1)
        val startTime = calendar.timeInMillis

        // Retrieve usage statistics for the interval
        val statsList = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, 
            startTime, 
            endTime
        )

        if (statsList.isNullOrEmpty()) {
            Log.w(TAG, "No usage statistics available. Ensure System Settings -> Usage Access is enabled.")
            return
        }

        Log.i(TAG, "Retrieved ${statsList.size} usage records:")
        for (usageStats in statsList) {
            val totalTimeSpent = usageStats.totalTimeInForeground
            if (totalTimeSpent > 0) {
                val appName = usageStats.packageName
                Log.d(TAG, "App: $appName, Foreground Time: ${totalTimeSpent / 1000} seconds")
                // Pack and send statistics to backend (e.g., PUT /api/usage-stats)
            }
        }
    }
}
