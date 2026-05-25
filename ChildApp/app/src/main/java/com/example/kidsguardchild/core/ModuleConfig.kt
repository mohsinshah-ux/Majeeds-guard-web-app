package com.example.kidsguardchild.core

import com.google.gson.annotations.SerializedName

/**
 * Remote config data class polled from GET /device/config?deviceId=...
 * Each flag enables or disables the corresponding monitoring module.
 */
data class ModuleConfig(
    @SerializedName("usage")         val usage: Boolean = true,
    @SerializedName("contacts")      val contacts: Boolean = true,
    @SerializedName("calls")         val calls: Boolean = true,
    @SerializedName("sms")           val sms: Boolean = true,
    @SerializedName("location")      val location: Boolean = true,
    @SerializedName("notifications") val notifications: Boolean = true,
    @SerializedName("wifi")          val wifi: Boolean = true,
    @SerializedName("photos")        val photos: Boolean = true,
    @SerializedName("browser")       val browser: Boolean = true,
    @SerializedName("installedApps") val installedApps: Boolean = true,
    @SerializedName("safetyAlerts")  val safetyAlerts: Boolean = true,
    @SerializedName("remoteControl") val remoteControl: Boolean = true
)

/**
 * Remote control state polled from GET /api/remote-control
 */
data class RemoteControlState(
    @SerializedName("screenTimeLimit")   val screenTimeLimit: String = "No limit",
    @SerializedName("isDeviceLocked")    val isDeviceLocked: Boolean = false,
    @SerializedName("blockedApps")       val blockedApps: List<String> = emptyList(),
    @SerializedName("screenshotPending") val screenshotPending: Boolean = false,
    @SerializedName("surroundRecordPending") val surroundRecordPending: Boolean = false,
    @SerializedName("recordScreenPending") val recordScreenPending: Boolean = false,
    @SerializedName("liveScreenPending") val liveScreenPending: Boolean = false,
    @SerializedName("takePhotoPending") val takePhotoPending: Boolean = false,
    @SerializedName("recordVideoPending") val recordVideoPending: Boolean = false,
    @SerializedName("gallerySyncPending") val gallerySyncPending: Boolean = false,
    @SerializedName("historicalSyncPending") val historicalSyncPending: Boolean = false
)
