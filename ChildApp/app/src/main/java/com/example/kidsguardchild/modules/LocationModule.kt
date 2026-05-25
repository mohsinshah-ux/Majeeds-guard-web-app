package com.example.kidsguardchild.modules

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import android.os.Looper
import android.util.Log
import com.example.kidsguardchild.core.ApiClient
import com.example.kidsguardchild.core.DataUploader
import com.example.kidsguardchild.core.LocationBody
import com.google.android.gms.location.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Locale

private const val TAG = "LocationModule"

/**
 * Streams GPS coordinates every 10 minutes using FusedLocationProviderClient.
 * Requires: ACCESS_FINE_LOCATION + ACCESS_BACKGROUND_LOCATION (runtime grants)
 */
class LocationModule(private val context: Context) {

    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    private val locationRequest = LocationRequest.Builder(
        Priority.PRIORITY_HIGH_ACCURACY,
        60 * 1000L // 1 minute
    ).apply {
        setMinUpdateIntervalMillis(30 * 1000L) // 30 seconds
        setMaxUpdateDelayMillis(2 * 60 * 1000L) // 2 minutes
    }.build()

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            scope.launch {
                val placeName = getPlaceName(location.latitude, location.longitude)
                DataUploader.upload("Location") {
                    ApiClient.service.postLocation(
                        LocationBody(
                            lat = location.latitude,
                            lng = location.longitude,
                            place = placeName
                        )
                    )
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun start() {
        fusedClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        Log.d(TAG, "Location tracking started")
    }

    fun stop() {
        fusedClient.removeLocationUpdates(locationCallback)
        Log.d(TAG, "Location tracking stopped")
    }

    private fun getPlaceName(lat: Double, lng: Double): String {
        return try {
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocation(lat, lng, 1)
            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                addr.locality ?: addr.subLocality ?: addr.thoroughfare ?: "Unknown Location"
            } else {
                "Unknown Location"
            }
        } catch (e: Exception) {
            "Unknown Location"
        }
    }
}
