package com.parentalcontrol.sdk.core

import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.util.Log

/**
 * Central coordinator for all SDK modules.
 *
 * Usage:
 *   val registry = ModuleRegistry(applicationContext)
 *   registry.registerModule(LocationModule())
 *   registry.registerModule(CallLogModule())
 *   // … register all modules once at app startup …
 *
 *   // After fetching GET /device/config:
 *   registry.updateConfig(moduleConfig)
 *
 *   // On app shutdown / Service destroyed:
 *   registry.stopAll()
 */
class ModuleRegistry(private val context: Context) {

    private val modules = LinkedHashMap<String, MonitoringModule>()
    private var currentConfig = ModuleConfig()

    companion object {
        private const val TAG = "ModuleRegistry"
    }

    // ─── Registration ────────────────────────────────────────────────────────

    fun registerModule(module: MonitoringModule) {
        module.init(context)
        modules[module.getModuleId()] = module
        Log.d(TAG, "Registered → ${module.getModuleId()}")
    }

    // ─── Config Update ───────────────────────────────────────────────────────

    /**
     * Applies a fresh backend config.  Starts modules that became enabled and
     * stops those that became disabled — without touching already-correct states.
     */
    fun updateConfig(newConfig: ModuleConfig) {
        currentConfig = newConfig
        Log.i(TAG, "Applying new remote config…")

        for ((id, module) in modules) {
            val shouldRun   = newConfig.isModuleEnabled(id)
            val hasPerms    = hasRequiredPermissions(module)
            val isRunning   = module.isEnabled()

            when {
                shouldRun && hasPerms && !isRunning -> {
                    Log.i(TAG, "Starting module: $id")
                    module.start()
                }
                shouldRun && !hasPerms && !isRunning -> {
                    Log.w(TAG, "Module $id enabled remotely but missing permissions — skipping")
                }
                !shouldRun && isRunning -> {
                    Log.i(TAG, "Stopping module: $id (disabled by backend)")
                    module.stop()
                }
                else -> Log.d(TAG, "Module $id unchanged (running=$isRunning, enabled=$shouldRun)")
            }
        }
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    /** Stop every running module (call from Service.onDestroy). */
    fun stopAll() {
        modules.values.filter { it.isEnabled() }.forEach { module ->
            Log.d(TAG, "Shutdown → stopping ${module.getModuleId()}")
            module.stop()
        }
    }

    // ─── Permissions ─────────────────────────────────────────────────────────

    /** Returns true only if every required permission is currently granted. */
    fun hasRequiredPermissions(module: MonitoringModule): Boolean {
        return module.getRequiredPermissions().all { perm ->
            val granted = ContextCompat.checkSelfPermission(context, perm) == PackageManager.PERMISSION_GRANTED
            if (!granted) Log.w(TAG, "Missing permission '$perm' for module ${module.getModuleId()}")
            granted
        }
    }

    /** Returns all permissions across all modules that are currently missing. */
    fun getMissingPermissions(): List<String> =
        modules.values.flatMap { module ->
            module.getRequiredPermissions().filter { perm ->
                ContextCompat.checkSelfPermission(context, perm) != PackageManager.PERMISSION_GRANTED
            }
        }.distinct()

    fun getModule(moduleId: String): MonitoringModule? = modules[moduleId]
    fun getConfig(): ModuleConfig = currentConfig
}
