package com.parentalcontrol.sdk

import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.util.Log

/**
 * Registry class that acts as the coordinator for all SDK modules.
 * Manages dynamic runtime toggles, lifecycle states, and permissions checking.
 */
class ModuleRegistry(private val context: Context) {
    private val modules = mutableMapOf<String, MonitoringModule>()
    private var currentConfig = ModuleConfig()

    companion object {
        private const val TAG = "ModuleRegistry"
    }

    /**
     * Registers a new module into the coordinator.
     */
    fun registerModule(module: MonitoringModule) {
        module.init(context)
        modules[module.getModuleId()] = module
        Log.d(TAG, "Registered module: ${module.getModuleId()}")
    }

    /**
     * Updates the active configuration and starts/stops modules accordingly.
     * Can be invoked dynamically after fetching GET /device/config.
     */
    fun updateConfig(newConfig: ModuleConfig) {
        currentConfig = newConfig
        Log.i(TAG, "Updating SDK modules configurations...")

        for ((moduleId, module) in modules) {
            val shouldEnable = newConfig.isModuleEnabled(moduleId)
            val hasPermissions = hasRequiredPermissions(module)

            if (shouldEnable && hasPermissions) {
                if (module.isEnabled()) {
                    // Update running module parameters if needed
                    Log.d(TAG, "Module $moduleId is already running.")
                } else {
                    Log.i(TAG, "Starting module: $moduleId")
                    module.start()
                }
            } else {
                if (module.isEnabled()) {
                    Log.i(TAG, "Stopping module: $moduleId (Config: $shouldEnable, Permissions: $hasPermissions)")
                    module.stop()
                }
            }
        }
    }

    /**
     * Stops all running modules (e.g. during app shutdown).
     */
    fun stopAll() {
        for ((moduleId, module) in modules) {
            if (module.isEnabled()) {
                Log.d(TAG, "Stopping module on shutdown: $moduleId")
                module.stop()
            }
        }
    }

    /**
     * Checks if all required manifest permissions for the module are granted.
     */
    fun hasRequiredPermissions(module: MonitoringModule): Boolean {
        for (permission in module.getRequiredPermissions()) {
            val status = ContextCompat.checkSelfPermission(context, permission)
            if (status != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "Permission $permission is missing for module ${module.getModuleId()}")
                return false
            }
        }
        return true
    }

    /**
     * Checks if a module is currently registered.
     */
    fun getModule(moduleId: String): MonitoringModule? {
        return modules[moduleId]
    }
}
