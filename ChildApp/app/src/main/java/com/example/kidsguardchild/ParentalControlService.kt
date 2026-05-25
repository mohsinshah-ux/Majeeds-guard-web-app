package com.example.kidsguardchild

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.BatteryBody
import com.example.kidsguardchild.core.ConfigFetcher
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.PermissionHelper
import com.example.kidsguardchild.core.InitialSyncManager
import com.example.kidsguardchild.modules.*
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

private const val TAG = "ParentalControlService"
private const val CHANNEL_ID = "kidsguard_monitor"
private const val NOTIFICATION_ID = 1001

/**
 * Foreground service — starts only permission-backed monitoring modules.
 * Fake telemetry simulator is disabled (production: real device data only).
 */
class ParentalControlService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var permissionWatchJob: Job? = null

    private var locationModule: LocationModule? = null
    private var usageStatsModule: UsageStatsModule? = null
    private var contactsModule: ContactsModule? = null
    private var callLogModule: CallLogModule? = null
    private var smsModule: SmsModule? = null
    private var wifiModule: WifiModule? = null
    private var safetyAlertsModule: SafetyAlertsModule? = null
    private var installedAppsModule: InstalledAppsModule? = null
    private var photosModule: PhotosModule? = null
    private var browserHistoryModule: BrowserHistoryModule? = null
    private var remoteControlModule: RemoteControlModule? = null
    private var calendarModule: CalendarModule? = null
    private var callRecordingModule: CallRecordingModule? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        Log.d(TAG, "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")

        val prefs = getSharedPreferences("kidsguard_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", null)
        if (serverUrl != null) {
            try {
                ApiClient.init(serverUrl, this@ParentalControlService)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to init API client: ${e.message}")
            }
        }

        if (!PermissionHelper.isPaired(this)) {
            Log.w(TAG, "Device not paired — monitoring modules will not upload data")
        } else {
            startPermissionGatedModules()
            startPermissionWatcher()
            InitialSyncManager.runIfNeeded(this, scope)
        }

        ConfigFetcher.schedule(this)

        scope.launch {
            while (isActive) {
                if (PermissionHelper.isPaired(this@ParentalControlService)) {
                    try {
                        val bm = getSystemService(Context.BATTERY_SERVICE) as? android.os.BatteryManager
                        if (bm != null) {
                            val level = bm.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY)
                            DataUploader.upload("Battery") {
                                ApiClient.service.postBattery(BatteryBody(level))
                            }
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Battery heartbeat failed: ${e.message}")
                    }
                    safetyAlertsModule?.checkBattery()
                }
                delay(TimeUnit.MINUTES.toMillis(1))
            }
        }

        return START_STICKY
    }

    /** Re-evaluate grants every 30s so modules start after the user completes the permission wizard. */
    private fun startPermissionWatcher() {
        permissionWatchJob?.cancel()
        permissionWatchJob = scope.launch {
            while (isActive) {
                if (PermissionHelper.isPaired(this@ParentalControlService)) {
                    startPermissionGatedModules()
                }
                delay(30_000)
            }
        }
    }

    private fun startPermissionGatedModules() {
        if (!PermissionHelper.isPaired(this)) return

        Log.d(TAG, "Permission state: ${PermissionHelper.summary(this)}")

        if (PermissionHelper.hasLocation(this)) {
            if (locationModule == null) {
                locationModule = LocationModule(this).also { it.start() }
                Log.i(TAG, "LocationModule started (GPS permission granted)")
            }
        } else {
            locationModule?.stop()
            locationModule = null
        }

        if (PermissionHelper.hasUsageStats(this)) {
            if (usageStatsModule == null) {
                usageStatsModule = UsageStatsModule(this).also { it.start() }
                Log.i(TAG, "UsageStatsModule started")
            }
        } else {
            usageStatsModule?.stop()
            usageStatsModule = null
        }

        if (PermissionHelper.hasContacts(this)) {
            if (contactsModule == null) {
                contactsModule = ContactsModule(this).also { it.start() }
                Log.i(TAG, "ContactsModule started")
            }
        } else {
            contactsModule?.stop()
            contactsModule = null
        }

        if (PermissionHelper.hasCallLog(this)) {
            if (callLogModule == null) {
                callLogModule = CallLogModule(this).also { it.start() }
                Log.i(TAG, "CallLogModule started")
            }
        } else {
            callLogModule?.stop()
            callLogModule = null
        }

        if (PermissionHelper.hasSms(this)) {
            if (smsModule == null) {
                smsModule = SmsModule(this).also { it.start() }
                Log.i(TAG, "SmsModule started")
            }
        } else {
            smsModule?.stop()
            smsModule = null
        }

        if (PermissionHelper.hasWifi(this)) {
            if (wifiModule == null) {
                wifiModule = WifiModule(this).also { it.start() }
                Log.i(TAG, "WifiModule started")
            }
        } else {
            wifiModule?.stop()
            wifiModule = null
        }

        if (safetyAlertsModule == null) {
            safetyAlertsModule = SafetyAlertsModule(this).also { it.start() }
            Log.i(TAG, "SafetyAlertsModule started")
        }

        if (PermissionHelper.canQueryInstalledApps(this)) {
            if (installedAppsModule == null) {
                installedAppsModule = InstalledAppsModule(this).also { it.start() }
                Log.i(TAG, "InstalledAppsModule started")
            }
        }

        if (PermissionHelper.hasMediaRead(this)) {
            if (photosModule == null) {
                photosModule = PhotosModule(this).also { it.start() }
                Log.i(TAG, "PhotosModule started")
            }
        } else {
            photosModule?.stop()
            photosModule = null
        }

        if (browserHistoryModule == null) {
            browserHistoryModule = BrowserHistoryModule(this).also { it.start() }
        }

        if (PermissionHelper.hasCalendar(this)) {
            if (calendarModule == null) {
                calendarModule = CalendarModule(this).also { it.start() }
                Log.i(TAG, "CalendarModule started")
            }
        } else {
            calendarModule?.stop()
            calendarModule = null
        }

        if (PermissionHelper.hasPhoneState(this) && PermissionHelper.hasRecordAudio(this)) {
            if (callRecordingModule == null) {
                callRecordingModule = CallRecordingModule(this).also { it.start() }
                Log.i(TAG, "CallRecordingModule started")
            }
        } else {
            callRecordingModule?.stop()
            callRecordingModule = null
        }

        if (remoteControlModule == null) {
            remoteControlModule = RemoteControlModule(this).also { module ->
                module.onBlockedAppsChanged = { blockedApps ->
                    installedAppsModule?.updateBlockedApps(blockedApps)
                }
                module.start()
            }
            Log.i(TAG, "RemoteControlModule started")
        }

        // NotificationModule is a system NotificationListenerService — enabled via Settings only.
        if (!PermissionHelper.hasNotificationListener(this)) {
            Log.d(TAG, "Notification listener not enabled — enable in Settings for notification/social uploads")
        }
    }

    private fun stopAllModules() {
        permissionWatchJob?.cancel()
        locationModule?.stop(); locationModule = null
        usageStatsModule?.stop(); usageStatsModule = null
        contactsModule?.stop(); contactsModule = null
        callLogModule?.stop(); callLogModule = null
        smsModule?.stop(); smsModule = null
        wifiModule?.stop(); wifiModule = null
        safetyAlertsModule?.stop(); safetyAlertsModule = null
        installedAppsModule?.stop(); installedAppsModule = null
        photosModule?.stop(); photosModule = null
        browserHistoryModule?.stop(); browserHistoryModule = null
        remoteControlModule?.stop(); remoteControlModule = null
        calendarModule?.stop(); calendarModule = null
        callRecordingModule?.stop(); callRecordingModule = null
        Log.d(TAG, "All modules stopped")
    }

    override fun onDestroy() {
        stopAllModules()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Child Safety Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Real device monitoring (permission-based only)"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
}
