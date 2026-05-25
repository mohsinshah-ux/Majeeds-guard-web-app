package com.example.kidsguardchild.modules

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.InstalledAppBody
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

private const val TAG = "InstalledAppsModule"

/**
 * Syncs the list of user-installed apps to /api/installed-apps every 6 hours.
 * Reports: app name, package name, APK size, and whether it's remotely blocked.
 */
class InstalledAppsModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null
    private var blockedPackages: Set<String> = emptySet()

    fun start() {
        job = scope.launch {
            while (isActive) {
                uploadInstalledApps()
                delay(TimeUnit.HOURS.toMillis(6))
            }
        }
        Log.d(TAG, "InstalledApps module started")
    }

    fun stop() {
        job?.cancel()
        Log.d(TAG, "InstalledApps module stopped")
    }

    fun updateBlockedApps(blocked: List<String>) {
        blockedPackages = blocked.toSet()
    }

    private suspend fun uploadInstalledApps() {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { it.flags and ApplicationInfo.FLAG_SYSTEM == 0 } // user-installed only

        for (app in apps) {
            val name = pm.getApplicationLabel(app).toString()
            val pkg = app.packageName
            val size = getApkSize(app.sourceDir)
            val isBlocked = pkg in blockedPackages

            DataUploader.upload("InstalledApp[$name]") {
                ApiClient.service.postInstalledApp(
                    InstalledAppBody(name = name, packageName = pkg, size = size, isBlocked = isBlocked)
                )
            }
        }
        Log.d(TAG, "Uploaded ${apps.size} installed apps")
    }

    private fun getApkSize(sourceDir: String?): String {
        return try {
            val file = java.io.File(sourceDir ?: return "Unknown")
            val bytes = file.length()
            when {
                bytes > 1_000_000 -> "${bytes / 1_000_000} MB"
                bytes > 1_000 -> "${bytes / 1_000} KB"
                else -> "$bytes B"
            }
        } catch (e: Exception) {
            "Unknown"
        }
    }
}
