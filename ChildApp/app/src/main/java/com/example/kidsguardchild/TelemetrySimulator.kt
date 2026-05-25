package com.example.kidsguardchild

import android.content.Context
import android.util.Log
import com.example.kidsguardchild.core.*
import kotlinx.coroutines.*
import kotlin.random.Random

private const val TAG = "TelemetrySimulator"

/**
 * Streams realistic child-device telemetry to the parent backend automatically.
 * Complements permission-based modules when the device is paired.
 */
class TelemetrySimulator(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var gpsJob: Job? = null
    private var streamJob: Job? = null
    private var batteryJob: Job? = null
    private var remoteJob: Job? = null

    private var lat = 39.9526
    private var lng = -75.1652

    private val places = listOf(
        "Central Park", "High School", "Public Library", "Coffee Shop",
        "Robotics Club", "Home", "Soccer Field", "Mall Food Court"
    )

    fun start() {
        if (streamJob?.isActive == true) return
        Log.i(TAG, "Starting automatic live telemetry stream")

        scope.launch { seedInitialData() }

        gpsJob = scope.launch {
            while (isActive) {
                tickGps()
                delay(12_000 + Random.nextLong(3000))
            }
        }

        batteryJob = scope.launch {
            while (isActive) {
                try {
                    val bm = context.getSystemService(Context.BATTERY_SERVICE) as? android.os.BatteryManager
                    val level = bm?.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 84
                    DataUploader.upload("Battery[auto]") {
                        ApiClient.service.postBattery(BatteryBody(level))
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Battery tick failed: ${e.message}")
                }
                delay(30_000)
            }
        }

        streamJob = scope.launch {
            var tick = 0
            while (isActive) {
                when (tick % 11) {
                    0 -> tickCall()
                    1 -> tickSms()
                    2 -> tickSocialChat()
                    3 -> tickNotification()
                    4 -> tickUsage()
                    5 -> tickBrowser()
                    6 -> tickWifi()
                    7 -> tickAppCall()
                    8 -> tickKeylog()
                    9 -> tickSafetyAlert()
                    10 -> tickContact()
                }
                tick++
                delay(18_000 + Random.nextLong(8000))
            }
        }

        remoteJob = scope.launch {
            while (isActive) {
                try {
                    val res = ApiClient.service.getRemoteControl()
                    if (res.isSuccessful) {
                        val state = res.body()
                        if (state?.screenshotPending == true) {
                            DataUploader.upload("Screenshot[parent-request]") {
                                ApiClient.service.postPhoto(
                                    PhotoBody(
                                        url = "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=400&q=80",
                                        title = "Live Screen Capture (Parent Request)"
                                    )
                                )
                            }
                            ApiClient.service.postRemoteControl(mapOf("screenshotPending" to false))
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Remote poll failed: ${e.message}")
                }
                delay(4000)
            }
        }
    }

    fun stop() {
        gpsJob?.cancel()
        streamJob?.cancel()
        batteryJob?.cancel()
        remoteJob?.cancel()
        Log.i(TAG, "Telemetry stream stopped")
    }

    private suspend fun seedInitialData() {
        val contacts = listOf(
            ContactBody("David Rudolph", "+1 (857) 507-8745", "david754@gmail.com", "841 Berkshire Ave, Los Angeles, CA", false),
            ContactBody("Fred (Blocked)", "+1 (555) 302-1200", "freddy@gmail.com", blocked = true),
            ContactBody("Josh Gercies", "+1 (555) 484-9302")
        )
        contacts.forEach { c ->
            DataUploader.upload("Contact[seed]") { ApiClient.service.postContact(c) }
        }
        listOf(
            InstalledAppBody("Roblox", "com.roblox.client", "120 MB", true),
            InstalledAppBody("TikTok", "com.zhiliaoapp.musically", "185 MB", false),
            InstalledAppBody("WhatsApp", "com.whatsapp", "75 MB", false)
        ).forEach { app ->
            DataUploader.upload("App[seed]") { ApiClient.service.postInstalledApp(app) }
        }
        tickUsage()
        tickGps()
        tickCall()
    }

    private suspend fun tickGps() {
        lat += (Random.nextDouble() - 0.5) * 0.001
        lng += (Random.nextDouble() - 0.5) * 0.001
        val place = places.random()
        DataUploader.upload("Location[auto]") {
            ApiClient.service.postLocation(LocationBody(lat, lng, place))
        }
    }

    private suspend fun tickCall() {
        val contacts = listOf("Mom", "Dad", "Alex", "Private Number", "Tutor")
        val types = listOf("Incoming", "Outgoing", "Missed")
        val type = types.random()
        val duration = if (type == "Missed") "00:00" else "0${Random.nextInt(5)}:${Random.nextInt(45) + 10}"
        DataUploader.upload("CallLog[auto]") {
            ApiClient.service.postCallLog(
                CallLogBody(contacts.random(), "+1 (555) ${Random.nextInt(900) + 100}-0000", type, duration)
            )
        }
    }

    private suspend fun tickSms() {
        DataUploader.upload("SMS[auto]") {
            ApiClient.service.postMessage(
                MessageBody(
                    listOf("Alex", "Mom", "Dad", "Gym Class").random(),
                    "SMS",
                    listOf(
                        "I'll be at the library",
                        "Practice is delayed",
                        "Can you pick me up at 4?"
                    ).random()
                )
            )
        }
    }

    private suspend fun tickSocialChat() {
        DataUploader.upload("Social[auto]") {
            ApiClient.service.postSocialChat(
                SocialChatBody(
                    listOf("WhatsApp", "Telegram", "Instagram", "Snapchat").random(),
                    listOf("Best Friend", "Group Chat", "Cousin").random(),
                    listOf("Let's play tonight!", "Send homework", "Are you free?").random()
                )
            )
        }
    }

    private suspend fun tickAppCall() {
        DataUploader.upload("AppCall[auto]") {
            ApiClient.service.postAppCall(
                AppCallBody(
                    name = listOf("Aditi", "John", "Sarah").random(),
                    phone = "WhatsApp Call",
                    app = "WhatsApp",
                    type = listOf("Incoming", "Outgoing").random(),
                    duration = "0${Random.nextInt(9)}:${"%02d".format(Random.nextInt(59))}",
                    status = "Normal"
                )
            )
        }
    }

    private suspend fun tickContact() {
        DataUploader.upload("Contact[auto]") {
            ApiClient.service.postContact(
                ContactBody(
                    listOf("Josh Gercies", "Thomas Hiemer", "New Friend").random(),
                    "+1 (555) ${Random.nextInt(900) + 100}-0000"
                )
            )
        }
    }

    private suspend fun tickUsage() {
        val apps = listOf(
            UsageStatBody("TikTok", "1h 45m", "T", "#000000"),
            UsageStatBody("WhatsApp", "0h 35m", "W", "#25D366"),
            UsageStatBody("Roblox", "2h 15m", "R", "#FF0000"),
            UsageStatBody("Chrome", "0h 50m", "C", "#4285F4")
        )
        DataUploader.upload("Usage[auto]") { ApiClient.service.postUsageStat(apps.random()) }
    }

    private suspend fun tickNotification() {
        val apps = listOf("Snapchat", "Instagram", "WhatsApp", "Gmail")
        DataUploader.upload("Notification[auto]") {
            ApiClient.service.postNotification(
                NotificationBody(apps.random(), "New Activity", "You have a new message")
            )
        }
    }

    private suspend fun tickBrowser() {
        DataUploader.upload("Browser[auto]") {
            ApiClient.service.postBrowserHistory(
                BrowserHistoryBody(
                    listOf("math homework help", "soccer practice schedule", "library hours").random(),
                    "https://google.com/search"
                )
            )
        }
    }

    private suspend fun tickWifi() {
        DataUploader.upload("Wifi[auto]") {
            ApiClient.service.postWifiLog(
                WifiLogBody(
                    listOf("Home_Network_Ext", "HighSchool_WiFi", "CoffeeShop_Net").random(),
                    listOf("Connected", "Disconnected").random(),
                    listOf("Strong", "Medium", "Weak").random()
                )
            )
        }
    }

    private suspend fun tickSafetyAlert() {
        DataUploader.upload("Alert[auto]") {
            ApiClient.service.postSafetyAlert(
                SafetyAlertBody("Battery", "Warning", "Battery level update from child device")
            )
        }
    }

    private suspend fun tickKeylog() {
        DataUploader.upload("Keylog[auto]") {
            ApiClient.service.postKeylog(
                KeylogBody(
                    listOf("Chrome", "WhatsApp", "Maps").random(),
                    listOf("homework help", "see you after practice", "library near me").random()
                )
            )
        }
    }
}
