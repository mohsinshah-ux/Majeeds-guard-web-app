package com.example.kidsguardchild

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.PhotoBody
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

private const val TAG = "ScreenshotCapture"

/**
 * When parent requests a screenshot, upload the most recent image from the device gallery
 * (requires READ_MEDIA_IMAGES). Real capture via MediaProjection can be added later.
 */
object ScreenshotCapture {

    suspend fun captureAndUpload(
        context: Context,
        source: String = "Parent Request",
        photoType: String = "screenshot"
    ) {
        withContext(Dispatchers.IO) {
            try {
                val projection = arrayOf(
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.DISPLAY_NAME,
                    MediaStore.Images.Media.DATA
                )
                val cursor = context.contentResolver.query(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    null,
                    null,
                    "${MediaStore.Images.Media.DATE_ADDED} DESC"
                )
                cursor?.use { c ->
                    if (!c.moveToFirst()) {
                        Log.w(TAG, "No images on device for screenshot upload")
                        uploadPlaceholder(source, photoType)
                        return@withContext
                    }
                    val name = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)) ?: "capture"
                    val path = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.DATA))
                    val url = if (!path.isNullOrBlank()) {
                        encodeImageToDataUrl(path) ?: "device://media/$name"
                    } else {
                        "device://media/$name"
                    }
                    DataUploader.upload("Capture[$source]") {
                        ApiClient.service.postPhoto(
                            PhotoBody(
                                url = url,
                                title = "Capture ($source)",
                                type = photoType
                            )
                        )
                    }
                    Log.i(TAG, "Capture uploaded ($photoType): $name")
                } ?: uploadPlaceholder(source, photoType)
            } catch (e: Exception) {
                Log.e(TAG, "Screenshot capture failed: ${e.message}")
                uploadPlaceholder(source, photoType)
            }
        }
    }

    private suspend fun uploadPlaceholder(source: String, photoType: String) {
        DataUploader.upload("Capture[placeholder]") {
            ApiClient.service.postPhoto(
                PhotoBody(
                    url = "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=400&q=80",
                    title = "Capture requested ($source) — grant Photos permission for real image",
                    type = photoType
                )
            )
        }
    }

    private fun encodeImageToDataUrl(path: String): String? {
        return try {
            val bitmap = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply {
                inSampleSize = 4
            }) ?: return null
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 60, stream)
            val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
            "data:image/jpeg;base64,$b64"
        } catch (e: Exception) {
            Log.w(TAG, "Could not encode image: ${e.message}")
            null
        }
    }
}
