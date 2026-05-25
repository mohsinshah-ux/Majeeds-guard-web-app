package com.example.kidsguardchild.core

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val TAG = "DataUploader"

/**
 * Shared coroutine-based HTTP upload helper.
 * Wraps any suspend lambda in IO dispatcher + error handling.
 */
object DataUploader {

    /**
     * Execute [block] on Dispatchers.IO.
     * Logs success/failure. Returns true on HTTP 2xx, false otherwise.
     */
    suspend fun upload(label: String, block: suspend () -> retrofit2.Response<*>): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val response = block()
                if (response.isSuccessful) {
                    Log.d(TAG, "✅ [$label] uploaded successfully")
                    true
                } else {
                    Log.w(TAG, "⚠️ [$label] HTTP ${response.code()}: ${response.message()}")
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ [$label] upload failed: ${e.message}")
                false
            }
        }
    }
}
