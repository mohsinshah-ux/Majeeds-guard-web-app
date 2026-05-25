# Android Parental Control SDK

A **production-ready**, **Play Store–compliant** Android parental control SDK built inside a single APK.  
All features are toggled remotely via backend config. All data collection requires **explicit user consent and runtime permissions**. A **persistent foreground notification** ensures full transparency.

---

## Architecture

```
android-sdk/
├── core/
│   ├── MonitoringModule.kt     ← Interface every module implements
│   ├── ModuleConfig.kt         ← Backend config data class (GET /device/config)
│   ├── ModuleRegistry.kt       ← Registers, starts/stops, permission-guards modules
│   ├── ConfigFetcher.kt        ← Polls backend every 15 min for updated flags
│   └── DataUploader.kt         ← Shared HTTP POST helper (IO coroutine)
│
├── modules/
│   ├── LocationModule.kt        ← GPS tracking (FusedLocationProviderClient)
│   ├── UsageStatsModule.kt      ← Screen time + top apps (UsageStatsManager)
│   ├── ContactsModule.kt        ← Most-contacted contacts 7-day window
│   ├── CallLogModule.kt         ← Call metadata (number, type, duration, time)
│   ├── SmsModule.kt             ← SMS count + timestamp metadata only
│   ├── WifiModule.kt            ← Wi-Fi connect/disconnect + SSID events
│   ├── SafetyAlertsModule.kt    ← App installs/removals + low battery alerts
│   ├── InstalledAppsModule.kt   ← User-installed app inventory (6h sync)
│   ├── PhotosModule.kt          ← Media count + date metadata (no file transfer)
│   ├── BrowserHistoryModule.kt  ← System browser URL metadata (Android ≤ 5.x)
│   ├── NotificationModule.kt    ← System notification title + package metadata
│   └── RemoteControlModule.kt   ← Lock device, screen timeout, app hiding (Device Admin)
│
├── ParentalControlService.kt    ← Foreground Service — boots all modules, polls config
├── DeviceAdminReceiver.kt       ← Device Admin lifecycle callbacks
├── BootReceiver.kt              ← Auto-restarts service after reboot
├── AndroidManifest.xml          ← All permission + component declarations
└── res/xml/device_admin.xml     ← Device admin policy declarations
```

---

## Backend Integration

### Remote Config Endpoint

```
GET /device/config?deviceId={id}

Response:
{
  "usage":         true,
  "contacts":      true,
  "calls":         true,
  "sms":           true,
  "location":      true,
  "notifications": true,
  "wifi":          true,
  "photos":        false,
  "browser":       true,
  "remoteControl": false
}
```

The `ConfigFetcher` polls this every **15 minutes** and calls `ModuleRegistry.updateConfig()` — modules start or stop dynamically without reinstalling.

### Data Upload Endpoints

| Module               | Endpoint                      | Frequency      |
|----------------------|-------------------------------|----------------|
| Location             | POST /api/locations           | Every ~10 min  |
| Usage Stats          | POST /api/usage-stats         | Every 30 min   |
| Contacts             | POST /api/contacts            | Every 1 hour   |
| Call Logs            | POST /api/call-logs           | Every 30 min   |
| SMS Metadata         | POST /api/sms-stats           | Every 1 hour   |
| Wi-Fi Events         | POST /api/wifi-logs           | On event       |
| Safety Alerts        | POST /api/safety-alerts       | On event       |
| Installed Apps       | POST /api/installed-apps      | Every 6 hours  |
| Media Stats          | POST /api/media-stats         | Every 12 hours |
| Browser History      | POST /api/browser-history     | Every 1 hour   |
| Notifications        | POST /api/notifications       | On event       |
| Remote Control ACK   | POST /api/remote-commands/ack | On command     |

---

## Permissions

### Runtime (user dialog required)

| Permission                    | Module           |
|-------------------------------|------------------|
| ACCESS_FINE_LOCATION          | Location         |
| ACCESS_COARSE_LOCATION        | Location         |
| ACCESS_BACKGROUND_LOCATION    | Location         |
| READ_CONTACTS                 | Contacts         |
| READ_CALL_LOG                 | Call Logs        |
| READ_SMS                      | SMS              |
| READ_MEDIA_IMAGES/VIDEO       | Photos           |

### Special App Access (deep-link to Settings)

| Permission              | Module              | Settings Path                          |
|-------------------------|---------------------|----------------------------------------|
| PACKAGE_USAGE_STATS     | UsageStats          | Settings → Apps → Special → Usage Access |
| BIND_NOTIFICATION_LISTENER | Notifications   | Settings → Apps → Special → Notification Access |
| BIND_DEVICE_ADMIN       | RemoteControl       | Settings → Security → Device Admin Apps |

---

## Compliance Checklist

- ✅ No APK injection or repackaging
- ✅ No access to encrypted third-party app messages
- ✅ No keylogger implementation
- ✅ No screen scraping of other apps
- ✅ All permissions are runtime-requested with explanatory dialogs
- ✅ Mandatory visible foreground notification at all times
- ✅ Modules dynamically toggled — no reinstall required
- ✅ Compliant with Google Play Families and Monitoring App policies
