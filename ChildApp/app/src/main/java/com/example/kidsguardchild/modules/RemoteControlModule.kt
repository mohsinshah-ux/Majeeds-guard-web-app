package com.example.kidsguardchild.modules

import android.content.Context
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.util.Log
import com.example.kidsguardchild.DeviceAdminReceiver
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.InitialSyncManager
import com.example.kidsguardchild.core.RemoteControlState
import com.example.kidsguardchild.media.MediaCaptureManager
import kotlinx.coroutines.*

private const val TAG = "RemoteControlModule"

class RemoteControlModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null

    private val devicePolicyManager by lazy {
        context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    }
    private val adminComponent by lazy {
        ComponentName(context, DeviceAdminReceiver::class.java)
    }

    var onBlockedAppsChanged: ((List<String>) -> Unit)? = null
    var onRemoteStateChanged: ((RemoteControlState) -> Unit)? = null

    fun start() {
        job = scope.launch {
            while (isActive) {
                pollRemoteControl()
                delay(4000)
            }
        }
        Log.d(TAG, "RemoteControl module started (4s polling)")
    }

    fun stop() {
        job?.cancel()
    }

    private suspend fun pollRemoteControl() {
        try {
            val response = ApiClient.service.getRemoteControl()
            if (!response.isSuccessful) return

            val state = response.body() ?: return
            onRemoteStateChanged?.invoke(state)

            handleDeviceLock(state.isDeviceLocked)
            onBlockedAppsChanged?.invoke(state.blockedApps)

            if (state.historicalSyncPending) {
                InitialSyncManager.reset(context)
                InitialSyncManager.runIfNeeded(context, scope)
                ack("historicalSyncPending")
            }
            if (state.gallerySyncPending) {
                runCapture { MediaCaptureManager.syncGallery(context, 50) }
                ack("gallerySyncPending")
            }
            if (state.screenshotPending) {
                runCapture { MediaCaptureManager.captureScreenshot(context, "Parent Request") }
                ack("screenshotPending")
            }
            if (state.surroundRecordPending) {
                runCapture { MediaCaptureManager.recordSurround(context) }
                ack("surroundRecordPending")
            }
            if (state.recordScreenPending) {
                runCapture { MediaCaptureManager.captureScreenRecording(context) }
                ack("recordScreenPending")
            }
            if (state.liveScreenPending) {
                runCapture { MediaCaptureManager.captureLiveScreen(context) }
                ack("liveScreenPending")
            }
            if (state.takePhotoPending) {
                runCapture { MediaCaptureManager.captureLatestPhoto(context) }
                ack("takePhotoPending")
            }
            if (state.recordVideoPending) {
                runCapture { MediaCaptureManager.captureVideosMetadata(context) }
                ack("recordVideoPending")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Remote control poll failed: ${e.message}")
        }
    }

    private fun runCapture(block: suspend () -> Unit) {
        scope.launch {
            try {
                block()
            } catch (e: Exception) {
                Log.e(TAG, "Remote capture failed: ${e.message}")
            }
        }
    }

    private suspend fun ack(flag: String) {
        try {
            ApiClient.service.postRemoteControl(mapOf(flag to false))
        } catch (e: Exception) {
            Log.w(TAG, "Failed to ack $flag: ${e.message}")
        }
    }

    private fun handleDeviceLock(shouldLock: Boolean) {
        if (!devicePolicyManager.isAdminActive(adminComponent)) return
        if (shouldLock) {
            try {
                devicePolicyManager.lockNow()
            } catch (e: SecurityException) {
                Log.e(TAG, "Failed to lock device: ${e.message}")
            }
        }
    }

    fun isAppBlocked(packageName: String, blockedApps: List<String>): Boolean =
        packageName in blockedApps
}
