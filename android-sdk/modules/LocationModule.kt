package com.parentalcontrol.sdk.modules

import android.Manifest
import android.content.Context
import android.location.Location
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.*
import com.parentalcontrol.sdk.core.DataUploader
import com.parentalcontrol.sdk.core.MonitoringModule
import org.json.JSONObject

/**
 * MODULE: Location Tracking
 * ─────────────────────────
 * Collects device GPS coordinates at a configurable interval and uploads
 * them to the dashboard via POST /api/locations.
 *
 * All tracking is performed only after the parent and child have explicitly
 * granted ACCESS_FINE_LOCATION during the app's on-boarding flow.
 *
 * A persistent foreground notification (managed by the host Service) informs
 * the child that the app is active — in full compliance with Google Play policy.
 */
class LocationModule(private val uploader: DataUploader) : MonitoringModule {

    private lateinit var ctx: Context
    private lateinit var fusedClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null
    private var running = false

    companion object {
        private const val TAG              = "LocationModule"
        private const val INTERVAL_MS      = 10 * 60 * 1000L   // 10 minutes
        private const val MIN_INTERVAL_MS  =  5 * 60 * 1000L   // 5 minutes
    }

    override fun init(context: Context) {
        ctx = context.applicationContext
        fusedClient = LocationServices.getFusedLocationProviderClient(ctx)
    }

    override fun start() {
        if (running) return

        val req = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(MIN_INTERVAL_MS)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.locations.forEach { uploadLocation(it) }
            }
        }

        try {
            fusedClient.requestLocationUpdates(req, locationCallback!!, Looper.getMainLooper())
            running = true
            Log.i(TAG, "Location tracking started.")
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission revoked during start(): ${e.message}")
        }
    }

    override fun stop() {
        locationCallback?.let { fusedClient.removeLocationUpdates(it) }
        locationCallback = null
        running = false
        Log.i(TAG, "Location tracking stopped.")
    }

    override fun isEnabled()           = running
    override fun getModuleId()         = "location"
    override fun getRequiredPermissions() = listOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    )

    private fun uploadLocation(loc: Location) {
        val payload = JSONObject().apply {
            put("lat",       loc.latitude)
            put("lng",       loc.longitude)
            put("accuracy",  loc.accuracy)
            put("timestamp", System.currentTimeMillis())
        }
        uploader.upload("/api/locations", payload)
        Log.d(TAG, "Location sample uploaded: ${loc.latitude}, ${loc.longitude}")
    }
}
