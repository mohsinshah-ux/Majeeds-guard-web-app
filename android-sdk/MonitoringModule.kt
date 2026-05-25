package com.parentalcontrol.sdk

import android.content.Context

/**
 * Interface that all parental control monitoring and management modules must implement.
 * Ensures uniform initialization, lifecycle control, and state management.
 */
interface MonitoringModule {
    /**
     * Initializes the module with the application context.
     * Performs lightweight tasks like setting up references, database helpers, or API clients.
     */
    fun init(context: Context)

    /**
     * Starts active data collection or enforcement routines.
     * Should only execute if [isEnabled] is true and required permissions are granted.
     */
    fun start()

    /**
     * Stops active routines, unregisters listeners, and releases resource-heavy objects.
     */
    fun stop()

    /**
     * Checks if the module is enabled based on the last retrieved backend configuration.
     */
    fun isEnabled(): Boolean

    /**
     * Returns the unique identifier of the module (e.g., "location", "usage_stats").
     */
    fun getModuleId(): String

    /**
     * Returns the list of Android manifest permissions required by this module to function.
     */
    fun getRequiredPermissions(): List<String>
}
