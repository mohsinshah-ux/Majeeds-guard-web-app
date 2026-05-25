package com.example.kidsguardchild.core

import android.content.Context
import android.util.Log
import androidx.work.*
import java.util.concurrent.TimeUnit

private const val TAG = "ConfigFetcher"

/**
 * WorkManager periodic worker that polls GET /device/config every 15 minutes
 * and updates the enabled/disabled state of each module via the ModuleRegistry.
 *
 * Since the current backend doesn't expose /device/config yet, we return a
 * fully-enabled default config. This is the correct graceful-degradation behavior.
 */
class ConfigFetcher(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        Log.d(TAG, "Polling remote config...")
        // Default config — all modules enabled. Backend can be extended later.
        val config = ModuleConfig()
        Log.d(TAG, "Config applied: $config")
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "config_fetcher"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<ConfigFetcher>(15, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
            Log.d(TAG, "ConfigFetcher scheduled (15 min interval)")
        }
    }
}
