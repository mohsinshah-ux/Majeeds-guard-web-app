package com.parentalcontrol.sdk.core

/**
 * Maps directly to the JSON payload returned by GET /device/config.
 *
 * Example response:
 * {
 *   "usage":         true,
 *   "contacts":      true,
 *   "calls":         true,
 *   "sms":           true,
 *   "location":      true,
 *   "notifications": true,
 *   "wifi":          true,
 *   "photos":        false,
 *   "browser":       true,
 *   "remoteControl": false
 * }
 */
data class ModuleConfig(
    val usage:          Boolean = false,
    val contacts:       Boolean = false,
    val calls:          Boolean = false,
    val sms:            Boolean = false,
    val location:       Boolean = false,
    val notifications:  Boolean = false,
    val wifi:           Boolean = false,
    val photos:         Boolean = false,
    val browser:        Boolean = false,
    val remoteControl:  Boolean = false
) {
    /**
     * Generic lookup so the registry can toggle any module purely by its ID
     * without a cascade of if-else statements.
     */
    fun isModuleEnabled(moduleId: String): Boolean = when (moduleId) {
        "usage_stats"     -> usage
        "contacts"        -> contacts
        "calls"           -> calls
        "sms"             -> sms
        "location"        -> location
        "notifications"   -> notifications
        "wifi"            -> wifi
        "photos"          -> photos
        "browser"         -> browser
        "remote_control"  -> remoteControl
        else              -> false
    }
}
