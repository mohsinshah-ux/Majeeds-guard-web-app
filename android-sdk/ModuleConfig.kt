package com.parentalcontrol.sdk

/**
 * Data class representing the remote configuration payload retrieved from GET /device/config.
 * Controls which modules are active on the device.
 */
data class ModuleConfig(
    val usage: Boolean = false,
    val contacts: Boolean = false,
    val calls: Boolean = false,
    val sms: Boolean = false,
    val location: Boolean = false,
    val notifications: Boolean = false,
    val wifi: Boolean = false,
    val remoteControl: Boolean = false
) {
    /**
     * Checks if a specific module is enabled based on its module ID.
     */
    fun isModuleEnabled(moduleId: String): Boolean {
        return when (moduleId) {
            "usage_stats" -> usage
            "contacts" -> contacts
            "calls" -> calls
            "sms" -> sms
            "location" -> location
            "notifications" -> notifications
            "wifi" -> wifi
            "remote_control" -> remoteControl
            else -> false
        }
    }
}
