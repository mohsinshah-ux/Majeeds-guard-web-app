package com.parentalcontrol.sdk.core

import android.content.Context

/**
 * Base interface for every parental-control monitoring module.
 * All modules must be togglable at runtime via remote backend configuration.
 */
interface MonitoringModule {

    /** One-time setup; store Context and initialise lightweight resources. */
    fun init(context: Context)

    /** Begin active data collection / enforcement. Guard with isEnabled() + permission check. */
    fun start()

    /** Release all listeners, jobs and heavy resources. */
    fun stop()

    /** True when the module is actively running. */
    fun isEnabled(): Boolean

    /** Unique key used in the backend config map, e.g. "location", "calls". */
    fun getModuleId(): String

    /**
     * Android permission strings required at runtime before start() may be called.
     * Special-access permissions (e.g. PACKAGE_USAGE_STATS) are checked separately
     * via AppOpsManager and must still be listed here for documentation purposes.
     */
    fun getRequiredPermissions(): List<String>
}
