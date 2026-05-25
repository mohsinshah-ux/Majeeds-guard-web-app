package com.parentalcontrol.sdk

import android.app.*
import android.content.ComponentName
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.parentalcontrol.sdk.core.*
import com.parentalcontrol.sdk.modules.*

/**
 * ParentalControlService
 * ──────────────────────
 * Long-lived Foreground Service that boots all SDK modules and keeps them
 * alive even when the app is backgrounded.
 *
 * A VISIBLE foreground notification is shown at all times (required by Android OS
 * and Google Play policy) so the device user is always aware monitoring is active.
 *
 * Declare in AndroidManifest.xml:
 *
 *   <service
 *       android:name=".ParentalControlService"
 *       android:enabled="true"
 *       android:exported="false"
 *       android:foregroundServiceType="dataSync|location" />
 *
 * Start from your Application or main Activity:
 *   Intent(this, ParentalControlService::class.java).also { startForegroundService(it) }
 */
class ParentalControlService : Service() {

    private lateinit var registry: ModuleRegistry
    private lateinit var uploader: DataUploader
    private lateinit var fetcher:  ConfigFetcher

    companion object {
        private const val TAG            = "ParentalControlService"
        private const val NOTIF_ID       = 1001
        private const val CHANNEL_ID     = "pc_monitoring_channel"
        const val BASE_URL               = "https://your-backend.example.com"  // ← replace
        const val DEVICE_ID_PREF         = "device_id"
    }

    // ─── Service Lifecycle ──────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
        Log.i(TAG, "ParentalControlService created.")

        val deviceId = getSharedPreferences("sdk", MODE_PRIVATE).getString(DEVICE_ID_PREF, "unknown") ?: "unknown"

        // 1. Create shared utilities
        uploader = DataUploader(BASE_URL, deviceId)

        // 2. Build the registry and register every module
        registry = ModuleRegistry(applicationContext).also { reg ->
            reg.registerModule(LocationModule(uploader))
            reg.registerModule(UsageStatsModule(uploader))
            reg.registerModule(ContactsModule(uploader))
            reg.registerModule(CallLogModule(uploader))
            reg.registerModule(SmsModule(uploader))
            reg.registerModule(WifiModule(uploader))
            reg.registerModule(SafetyAlertsModule(uploader))
            reg.registerModule(InstalledAppsModule(uploader))
            reg.registerModule(PhotosModule(uploader))
            reg.registerModule(BrowserHistoryModule(uploader))
            reg.registerModule(RemoteControlModule(
                uploader,
                ComponentName(this, "com.parentalcontrol.sdk.DeviceAdminReceiver")
            ))
        }

        // 3. Wire up the notification module (it's a Service; needs special handling)
        NotificationModule.instance?.let { nm ->
            nm.setUploader(uploader)
            registry.registerModule(nm)
        }

        // 4. Fetch remote config immediately, then poll every 15 min
        fetcher = ConfigFetcher(BASE_URL, deviceId) { config ->
            Log.i(TAG, "New remote config received — updating registry.")
            registry.updateConfig(config)
        }
        fetcher.fetchOnce()
        fetcher.startPolling()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand")
        return START_STICKY   // restart automatically if killed by OS
    }

    override fun onDestroy() {
        fetcher.stopPolling()
        registry.stopAll()
        uploader.shutdown()
        Log.i(TAG, "ParentalControlService destroyed — all modules stopped.")
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ─── Foreground Notification ────────────────────────────────────────────────

    /**
     * Creates the mandatory visible notification.
     * Text is intentionally transparent: "Child Safety Monitor is running."
     */
    private fun buildNotification(): Notification {
        val openAppPi = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Child Safety Monitor")
            .setContentText("Parental monitoring is active. Tap to open.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(openAppPi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Child Safety Monitor",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Indicates that parental monitoring is running on this device."
        }
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
    }
}
