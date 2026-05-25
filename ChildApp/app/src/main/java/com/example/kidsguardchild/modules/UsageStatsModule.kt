package com.example.kidsguardchild.modules

import android.app.usage.UsageStatsManager
import android.content.Context
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.UsageStatBody
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

private const val TAG = "UsageStatsModule"

/**
 * Reads app usage statistics via UsageStatsManager and uploads:
 *  - Per-app screen time (last 7 days)
 *  - Social app breakdown (WhatsApp, TikTok, Instagram, Snapchat, Telegram, YouTube)
 *
 * Requires PACKAGE_USAGE_STATS special app access permission.
 * Uploads every 30 minutes via a coroutine job.
 */
class UsageStatsModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null

    // Social apps we specifically track
    private val socialApps = setOf(
        "com.whatsapp", "com.zhiliaoapp.musically", "com.instagram.android",
        "com.snapchat.android", "org.telegram.messenger", "com.google.android.youtube",
        "com.facebook.katana", "com.twitter.android", "com.reddit.frontpage"
    )

    fun start() {
        job = scope.launch {
            syncHistorical()
            while (isActive) {
                uploadUsageStats()
                delay(TimeUnit.MINUTES.toMillis(30))
            }
        }
        Log.d(TAG, "UsageStats module started")
    }

    suspend fun syncHistorical() {
        uploadUsageStats()
        Log.i(TAG, "Usage stats historical sync done")
    }

    fun stop() {
        job?.cancel()
        Log.d(TAG, "UsageStats module stopped")
    }

    private suspend fun uploadUsageStats() {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return

        val endTime = System.currentTimeMillis()
        val startTime = endTime - TimeUnit.DAYS.toMillis(7)

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, startTime, endTime
        ) ?: return

        // Aggregate total foreground time per package
        val aggregated = mutableMapOf<String, Long>()
        for (stat in stats) {
            if (stat.totalTimeInForeground > 0) {
                aggregated[stat.packageName] = (aggregated[stat.packageName] ?: 0) + stat.totalTimeInForeground
            }
        }

        // Sort and take top 10
        val topApps = aggregated.entries
            .sortedByDescending { it.value }
            .take(10)

        for ((pkg, ms) in topApps) {
            val label = getAppLabel(pkg)
            val duration = formatDuration(ms)
            val isSocial = pkg in socialApps
            val color = if (isSocial) "#E91E63" else "#2196F3"
            val icon = label.firstOrNull()?.toString() ?: "?"

            DataUploader.upload("UsageStats[$label]") {
                ApiClient.service.postUsageStat(
                    UsageStatBody(app = label, duration = duration, icon = icon, color = color)
                )
            }
        }
    }

    private fun getAppLabel(packageName: String): String {
        return try {
            val pm = context.packageManager
            val info = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(info).toString()
        } catch (e: Exception) {
            packageName.substringAfterLast(".")
        }
    }

    private fun formatDuration(ms: Long): String {
        val hours = TimeUnit.MILLISECONDS.toHours(ms)
        val minutes = TimeUnit.MILLISECONDS.toMinutes(ms) % 60
        return "${hours}h ${minutes}m"
    }
}
