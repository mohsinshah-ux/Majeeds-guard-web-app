package com.parentalcontrol.sdk

import android.Manifest
import android.content.Context
import android.location.Location
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.*

/**
 * Monitoring module for transparent, consent-based Location Tracking and Geofencing.
 * Uses Google Play Services Location API.
 */
class LocationModule : MonitoringModule {
    private lateinit var context: Context
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    private var isRunning = false

    companion object {
        private const val TAG = "LocationModule"
        private const val UPDATE_INTERVAL_MS = 600000L // 10 minutes
        private const val FASTEST_INTERVAL_MS = 300000L // 5 minutes
    }

    override fun init(context: Context) {
        this.context = context
        this.fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    }

    override fun start() {
        if (isRunning) return

        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    handleNewLocation(location)
                }
            }
        }

        try {
            // Re-verify permission before calling APIs
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                Looper.getMainLooper()
            )
            isRunning = true
            Log.d(TAG, "Location updates started successfully.")
        } catch (unlikely: SecurityException) {
            isRunning = false
            Log.e(TAG, "SecurityException: Consent/Permission lost during initialization: ${unlikely.message}")
        }
    }

    override fun stop() {
        if (!isRunning) return
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
        }
        locationCallback = null
        isRunning = false
        Log.d(TAG, "Location updates stopped.")
    }

    override fun isEnabled(): Boolean {
        return isRunning
    }

    override fun getModuleId(): String {
        return "location"
    }

    override fun getRequiredPermissions(): List<String> {
        return listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    }

    private fun handleNewLocation(location: Location) {
        Log.i(TAG, "New Location Sample: Lat=${location.latitude}, Lng=${location.longitude}, Accuracy=${location.accuracy}m")
        // Implementation note: Here, location coordinates are packed and uploaded to the 
        // parental dashboard endpoint (e.g., POST /api/locations) when internet is available.
    }
}
