package com.example.kidsguardchild

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.kidsguardchild.core.*
import com.example.kidsguardchild.ui.AccountDetailsTab
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// â”€â”€â”€ Color Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

private val DarkBg = Color(0xFF020617)
private val CardBg = Color(0xFF090D1F)
private val BorderColor = Color(0xFF1E293B)
private val Emerald = Color(0xFF10B981)
private val EmeraldDark = Color(0xFF064E3B)
private val Teal = Color(0xFF14B8A6)
private val TextPrimary = Color(0xFFE5FFE5)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted = Color(0xFF64748B)
private val ErrorRed = Color(0xFFEF4444)
private val WarningAmber = Color(0xFFF59E0B)
private val InfoBlue = Color(0xFF3B82F6)

class MainActivity : ComponentActivity() {

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* handled in compose state */ }

    private val contactsPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* handled in compose state */ }

    private val phoneDataPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* handled in compose state */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("kidsguard_prefs", MODE_PRIVATE)
        val defaultUrl = getString(R.string.default_server_url)
        val savedUrl = prefs.getString("server_url", null)?.takeIf { it.isNotBlank() } ?: defaultUrl
        val savedToken = prefs.getString("device_token", "") ?: ""
        val isPaired = prefs.getBoolean("is_paired", false)

        setContent {
            KidsGuardApp(
                activityContext = this,
                savedUrl = savedUrl,
                savedToken = savedToken,
                isPaired = isPaired,
                onPaired = { url, token, label ->
                    prefs.edit()
                        .putString("server_url", url)
                        .putString("device_token", token)
                        .putString("device_id", token)
                        .putBoolean("is_paired", true)
                        .apply()
                    AccountPrefs.markPaired(this, label)
                },
                onLogout = {
                    stopService(Intent(this, ParentalControlService::class.java))
                    AccountPrefs.clearSession(this)
                },
                onStartService = {
                    val intent = Intent(this, ParentalControlService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent)
                    } else {
                        startService(intent)
                    }
                },
                onRequestLocationPermission = {
                    locationPermissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                },
                onRequestContactsPermission = {
                    contactsPermissionLauncher.launch(Manifest.permission.READ_CONTACTS)
                },
                onRequestPhoneDataPermissions = {
                    val perms = mutableListOf(
                        Manifest.permission.READ_CONTACTS,
                        Manifest.permission.READ_CALL_LOG,
                        Manifest.permission.READ_PHONE_STATE,
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.READ_SMS,
                        Manifest.permission.READ_CALENDAR,
                    )
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        perms.add(Manifest.permission.READ_MEDIA_IMAGES)
                    } else {
                        @Suppress("DEPRECATION")
                        perms.add(Manifest.permission.READ_EXTERNAL_STORAGE)
                    }
                    phoneDataPermissionLauncher.launch(perms.toTypedArray())
                },
                onOpenUsageAccessSettings = {
                    startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                },
                onOpenNotificationSettings = {
                    startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                },
                onOpenDeviceAdminSettings = {
                    val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
                    intent.putExtra(
                        DevicePolicyManager.EXTRA_DEVICE_ADMIN,
                        ComponentName(this, com.example.kidsguardchild.DeviceAdminReceiver::class.java)
                    )
                    intent.putExtra(
                        DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                        "Required for screen time control and remote device management."
                    )
                    startActivity(intent)
                }
            )
        }
    }
}

// â”€â”€â”€ Root Composable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Composable
fun KidsGuardApp(
    activityContext: Context,
    savedUrl: String,
    savedToken: String,
    isPaired: Boolean,
    onPaired: (String, String, String) -> Unit,
    onLogout: () -> Unit,
    onStartService: () -> Unit,
    onRequestLocationPermission: () -> Unit,
    onRequestContactsPermission: () -> Unit,
    onRequestPhoneDataPermissions: () -> Unit,
    onOpenUsageAccessSettings: () -> Unit,
    onOpenNotificationSettings: () -> Unit,
    onOpenDeviceAdminSettings: () -> Unit
) {
    var currentStep by remember { mutableIntStateOf(if (isPaired) 4 else 0) }
    var serverUrl by remember { mutableStateOf(savedUrl) }
    var deviceName by remember { mutableStateOf("") }
    var pairingToken by remember { mutableStateOf(savedToken) }

    // If already paired, init the API client and jump to dashboard
    LaunchedEffect(isPaired) {
        if (isPaired && savedUrl.isNotBlank()) {
            ApiClient.init(savedUrl, activityContext)
            onStartService()
        }
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Emerald,
            secondary = Teal,
            background = DarkBg,
            surface = CardBg,
            onPrimary = Color.Black,
            onBackground = TextPrimary,
            onSurface = TextPrimary,
            error = ErrorRed
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = DarkBg
        ) {
            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    slideInHorizontally { it } + fadeIn() togetherWith
                            slideOutHorizontally { -it } + fadeOut()
                },
                label = "wizard_step"
            ) { step ->
                when (step) {
                    0 -> SplashScreen(onNext = { currentStep = 1 })
                    1 -> ServerSetupScreen(
                        serverUrl = serverUrl,
                        deviceName = deviceName,
                        onUrlChange = { serverUrl = it },
                        onDeviceNameChange = { deviceName = it },
                        onNext = { currentStep = 2 }
                    )
                    2 -> PairingScreen(
                        serverUrl = serverUrl,
                        deviceName = deviceName,
                        token = pairingToken,
                        onTokenChange = { pairingToken = it },
                        onPaired = {
                            onPaired(serverUrl, pairingToken, deviceName.ifBlank { "Child Device" })
                            currentStep = 3
                        },
                        onBack = { currentStep = 1 }
                    )
                    3 -> PermissionsScreen(
                        onRequestLocation = onRequestLocationPermission,
                        onRequestContacts = onRequestContactsPermission,
                        onRequestPhoneData = onRequestPhoneDataPermissions,
                        onOpenUsageAccess = onOpenUsageAccessSettings,
                        onOpenNotifications = onOpenNotificationSettings,
                        onOpenDeviceAdmin = onOpenDeviceAdminSettings,
                        onComplete = {
                            onStartService()
                            currentStep = 4
                        }
                    )
                    4 -> DashboardScreen(
                        onLogout = {
                            onLogout()
                            currentStep = 0
                            serverUrl = activityContext.getString(R.string.default_server_url)
                            pairingToken = ""
                            deviceName = ""
                        }
                    )
                }
            }
        }
    }
}

// â”€â”€â”€ Step 0: Splash Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Composable
fun SplashScreen(onNext: () -> Unit) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size((80 * pulseScale).dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(Emerald.copy(alpha = 0.3f), EmeraldDark.copy(alpha = 0.1f))
                    )
                )
                .border(1.dp, Emerald.copy(alpha = 0.3f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Shield,
                contentDescription = "Shield",
                tint = Emerald,
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = "Majeeds Testing Guard System",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
            letterSpacing = 2.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Child Safety Guardian",
            fontSize = 14.sp,
            color = TextSecondary,
            letterSpacing = 3.sp
        )

        Spacer(modifier = Modifier.height(48.dp))

        GradientButton(
            text = "Get Started",
            onClick = onNext
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Secure â€¢ Consented â€¢ Transparent",
            fontSize = 10.sp,
            color = TextMuted,
            letterSpacing = 2.sp
        )
    }
}

// â”€â”€â”€ Step 1: Server Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Composable
fun ServerSetupScreen(
    serverUrl: String,
    deviceName: String,
    onUrlChange: (String) -> Unit,
    onDeviceNameChange: (String) -> Unit,
    onNext: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(60.dp))

        StepIndicator(currentStep = 1, totalSteps = 4)

        Spacer(modifier = Modifier.height(32.dp))

        SectionIcon(Icons.Default.Dns)
        Spacer(modifier = Modifier.height(16.dp))

        Text("Connect to Parent Server", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Enter the server URL provided by your parent's dashboard app.",
            fontSize = 12.sp, color = TextSecondary, textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(32.dp))

        DarkTextField(
            value = serverUrl,
            onValueChange = onUrlChange,
            label = "Server URL",
            placeholder = stringResource(R.string.default_server_url),
            keyboardType = KeyboardType.Uri
        )

        Spacer(modifier = Modifier.height(16.dp))

        DarkTextField(
            value = deviceName,
            onValueChange = onDeviceNameChange,
            label = "Device Name",
            placeholder = "e.g. Child's Android Phone"
        )

        Spacer(modifier = Modifier.height(24.dp))

        InfoCard(
            icon = Icons.Default.Info,
            text = "The server URL is displayed on your parent's dashboard. You can find it at the bottom of the web app sidebar.",
            color = InfoBlue
        )

        Spacer(modifier = Modifier.height(32.dp))

        GradientButton(
            text = "Continue",
            onClick = onNext,
            enabled = serverUrl.isNotBlank()
        )
    }
}

// â”€â”€â”€ Step 2: Pairing / Token Redeem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Composable
fun PairingScreen(
    serverUrl: String,
    deviceName: String,
    token: String,
    onTokenChange: (String) -> Unit,
    onPaired: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        context.getSharedPreferences("kidsguard_prefs", Context.MODE_PRIVATE)
            .edit()
            .remove("device_id")
            .remove("device_token")
            .putBoolean("is_paired", false)
            .apply()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(60.dp))

        StepIndicator(currentStep = 2, totalSteps = 4)

        Spacer(modifier = Modifier.height(32.dp))

        SectionIcon(Icons.Default.Link)
        Spacer(modifier = Modifier.height(16.dp))

        Text("Pair Device", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Enter the pairing token from your parent's dashboard invite link.",
            fontSize = 12.sp, color = TextSecondary, textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(32.dp))

        DarkTextField(
            value = token,
            onValueChange = onTokenChange,
            label = "Pairing Token",
            placeholder = "e.g. a1b2c3d4e5"
        )

        Spacer(modifier = Modifier.height(24.dp))

        InfoCard(
            icon = Icons.Default.Warning,
            text = "By proceeding, you explicitly grant consent for this device to report usage statistics, GPS location, call records, and message logs to the parent dashboard.",
            color = WarningAmber
        )

        if (error != null) {
            Spacer(modifier = Modifier.height(16.dp))
            InfoCard(icon = Icons.Default.Error, text = error!!, color = ErrorRed)
        }

        Spacer(modifier = Modifier.height(32.dp))

        GradientButton(
            text = if (isLoading) "Pairing..." else "Pair & Activate",
            onClick = {
                scope.launch {
                    isLoading = true
                    error = null
                    try {
                        ApiClient.initForPairing(serverUrl)
                        val health = withContext(Dispatchers.IO) {
                            ApiClient.service.healthCheck()
                        }
                        if (!health.isSuccessful) {
                            error = "Cannot reach server (HTTP ${health.code()}). Use https://your-app.vercel.app (same URL as parent dashboard)."
                            return@launch
                        }
                        val response = withContext(Dispatchers.IO) {
                            ApiClient.service.redeemInvite(
                                RedeemRequest(
                                    token = token.trim(),
                                    deviceName = deviceName.ifBlank { "Child's Phone" },
                                    consent = true
                                )
                            )
                        }
                        if (response.isSuccessful) {
                            ApiClient.init(serverUrl, context)
                            onPaired()
                        } else {
                            val serverMsg = response.errorBody()?.string()
                                ?.let { body ->
                                    Regex(""""error"\s*:\s*"([^"]+)"""")
                                        .find(body)?.groupValues?.get(1)
                                }
                            val hint = when (response.code()) {
                                401 -> " Generate a new token on the parent dashboard, then pair again. Turn off Vercel Deployment Protection if enabled."
                                404 -> " Token not found â€” create a fresh invite on the parent site after deploy, then copy the new token."
                                else -> ""
                            }
                            error = buildString {
                                append("Pairing failed (HTTP ${response.code()}).")
                                if (!serverMsg.isNullOrBlank()) append(" $serverMsg")
                                else append(" The token may be invalid or expired.")
                                append(hint)
                            }
                        }
                    } catch (e: Exception) {
                        val msg = e.message ?: "unknown error"
                        val hint = when {
                            msg.contains("timeout", ignoreCase = true) ->
                                " Server took too long. Confirm URL is https://YOUR-PROJECT.vercel.app (not 192.168.x.x) and redeploy the latest code."
                            msg.contains("Unable to resolve host", ignoreCase = true) ->
                                " Check internet connection and Server URL spelling."
                            else -> ""
                        }
                        error = "Connection failed: $msg$hint"
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = token.isNotBlank() && !isLoading
        )

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(onClick = onBack) {
            Text("â† Back to server setup", color = TextMuted, fontSize = 12.sp)
        }
    }
}

// â”€â”€â”€ Step 3: Permission Wizard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Composable
fun PermissionsScreen(
    onRequestLocation: () -> Unit,
    onRequestContacts: () -> Unit,
    onRequestPhoneData: () -> Unit,
    onOpenUsageAccess: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenDeviceAdmin: () -> Unit,
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    var refreshKey by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(1500)
            refreshKey++
        }
    }
    val permissionSteps = remember(refreshKey) {
        listOf(
            PermissionItem(
                title = "Location Access",
                description = "Required for live GPS on the parent map",
                icon = Icons.Default.LocationOn,
                color = InfoBlue,
                action = onRequestLocation,
                checkGranted = { PermissionHelper.hasLocation(context) }
            ),
            PermissionItem(
                title = "Contacts",
                description = "Sync contacts list to the parent dashboard",
                icon = Icons.Default.Contacts,
                color = Teal,
                action = onRequestContacts,
                checkGranted = { PermissionHelper.hasContacts(context) }
            ),
            PermissionItem(
                title = "Calls, SMS & Photos",
                description = "Call logs, message previews, and photo metadata",
                icon = Icons.Default.Phone,
                color = Emerald,
                action = onRequestPhoneData,
                checkGranted = {
                    PermissionHelper.hasCallLog(context) &&
                        PermissionHelper.hasSms(context) &&
                        PermissionHelper.hasMediaRead(context) &&
                        PermissionHelper.hasCalendar(context)
                }
            ),
            PermissionItem(
                title = "Usage Stats Access",
                description = "Open Settings and enable Usage access for this app",
                icon = Icons.Default.BarChart,
                color = Emerald,
                action = onOpenUsageAccess,
                checkGranted = { PermissionHelper.hasUsageStats(context) }
            ),
            PermissionItem(
                title = "Notification Listener",
                description = "Open Settings and enable notification access for Majeeds Testing Guard System",
                icon = Icons.Default.Notifications,
                color = Color(0xFF8B5CF6),
                action = onOpenNotifications,
                checkGranted = { PermissionHelper.hasNotificationListener(context) }
            ),
            PermissionItem(
                title = "Device Admin (optional)",
                description = "Remote lock and screen time enforcement",
                icon = Icons.Default.AdminPanelSettings,
                color = WarningAmber,
                action = onOpenDeviceAdmin,
                checkGranted = { true }
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(48.dp))

        StepIndicator(currentStep = 3, totalSteps = 4)

        Spacer(modifier = Modifier.height(24.dp))

        SectionIcon(Icons.Default.Security)
        Spacer(modifier = Modifier.height(16.dp))

        Text("Grant Permissions", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Grant each permission below. Monitoring uses only real device data â€” nothing is simulated.",
            fontSize = 12.sp, color = TextSecondary, textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(24.dp))

        permissionSteps.forEachIndexed { index, item ->
            PermissionCard(item = item)
            if (index < permissionSteps.lastIndex) {
                Spacer(modifier = Modifier.height(12.dp))
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        GradientButton(
            text = "Start Monitoring",
            onClick = onComplete
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            "You can adjust permissions later in device Settings.",
            fontSize = 10.sp, color = TextMuted, textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))
    }
}

data class PermissionItem(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val color: Color,
    val action: () -> Unit,
    val checkGranted: () -> Boolean
)

@Composable
fun PermissionCard(item: PermissionItem) {
    var granted by remember { mutableStateOf(item.checkGranted()) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                if (!granted) item.action()
                granted = item.checkGranted()
            },
        colors = CardDefaults.cardColors(containerColor = CardBg),
        border = BorderStroke(1.dp, if (granted) Emerald.copy(alpha = 0.3f) else BorderColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(item.color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = item.icon,
                    contentDescription = item.title,
                    tint = item.color,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(item.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text(item.description, fontSize = 11.sp, color = TextMuted)
            }

            Spacer(modifier = Modifier.width(8.dp))

            if (granted) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Granted",
                    tint = Emerald,
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "Grant",
                    tint = TextMuted,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

// â”€â”€â”€ Step 4: Live Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Composable
fun DashboardScreen(onLogout: () -> Unit) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = CardBg,
                contentColor = TextPrimary
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Status") },
                    label = { Text("Status") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Emerald,
                        selectedTextColor = Emerald,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted,
                        indicatorColor = Emerald.copy(alpha = 0.1f)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.AccountCircle, contentDescription = "Account") },
                    label = { Text("Account") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Emerald,
                        selectedTextColor = Emerald,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted,
                        indicatorColor = Emerald.copy(alpha = 0.1f)
                    )
                )
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            if (selectedTab == 0) {
                StatusTab()
            } else {
                AccountDetailsTab(onLogout = onLogout)
            }
        }
    }
}

@Composable
fun StatusTab() {
    val infiniteTransition = rememberInfiniteTransition(label = "live")
    val dotAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "live_dot"
    )

    val modules = remember {
        listOf(
            ModuleStatus("Location GPS", Icons.Default.LocationOn, Color(0xFF3B82F6), "~10 min intervals"),
            ModuleStatus("Call Logs", Icons.Default.Phone, Color(0xFF10B981), "Every 30 min"),
            ModuleStatus("SMS Metadata", Icons.Default.Message, Color(0xFF8B5CF6), "Every 1 hour"),
            ModuleStatus("App Usage", Icons.Default.BarChart, Color(0xFFF59E0B), "Every 30 min"),
            ModuleStatus("Contacts", Icons.Default.Contacts, Color(0xFF14B8A6), "Every 1 hour"),
            ModuleStatus("Installed Apps", Icons.Default.Apps, Color(0xFF06B6D4), "Every 6 hours"),
            ModuleStatus("Notifications", Icons.Default.Notifications, Color(0xFFA855F7), "Real-time"),
            ModuleStatus("Browser History", Icons.Default.Language, Color(0xFF6366F1), "Every 1 hour"),
            ModuleStatus("Wi-Fi Monitor", Icons.Default.Wifi, Color(0xFF0EA5E9), "On event"),
            ModuleStatus("Safety Alerts", Icons.Default.Warning, Color(0xFFEF4444), "On event"),
            ModuleStatus("Photos / Media", Icons.Default.Photo, Color(0xFFEC4899), "Every 12 hours"),
            ModuleStatus("Remote Control", Icons.Default.AdminPanelSettings, Color(0xFFEAB308), "Polling 4s"),
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "MONITORING ACTIVE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    letterSpacing = 3.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Majeeds Testing Guard",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Emerald.copy(alpha = dotAlpha))
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("LIVE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Emerald, letterSpacing = 2.sp)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Status Summary Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = BorderStroke(1.dp, Emerald.copy(alpha = 0.2f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatusPill(label = "Modules", value = "${modules.size}", color = Emerald)
                StatusPill(label = "Status", value = "Active", color = Emerald)
                StatusPill(label = "Uplink", value = "Online", color = InfoBlue)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            "ACTIVE MODULES",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = TextMuted,
            letterSpacing = 3.sp
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Module Grid
        modules.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                row.forEach { module ->
                    ModuleCard(
                        module = module,
                        modifier = Modifier.weight(1f)
                    )
                }
                // If row has only 1 item, add spacer
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Footer
        Text(
            "All data is transmitted securely to the parent dashboard.\nMonitoring runs as a foreground service with persistent notification.",
            fontSize = 10.sp,
            color = TextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(24.dp))
    }
}

data class ModuleStatus(
    val name: String,
    val icon: ImageVector,
    val color: Color,
    val frequency: String
)

@Composable
fun ModuleCard(module: ModuleStatus, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = CardBg),
        border = BorderStroke(1.dp, BorderColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = module.icon,
                    contentDescription = module.name,
                    tint = module.color,
                    modifier = Modifier.size(18.dp)
                )
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(Emerald)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                module.name,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Text(
                module.frequency,
                fontSize = 9.sp,
                color = TextMuted
            )
        }
    }
}

// â”€â”€â”€ Shared UI Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Composable
fun StepIndicator(currentStep: Int, totalSteps: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(totalSteps) { index ->
            val step = index + 1
            Box(
                modifier = Modifier
                    .height(4.dp)
                    .width(if (step <= currentStep) 32.dp else 16.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        if (step <= currentStep) Emerald
                        else BorderColor
                    )
            )
        }
    }
}

@Composable
fun SectionIcon(icon: ImageVector) {
    Box(
        modifier = Modifier
            .size(56.dp)
            .clip(CircleShape)
            .background(Emerald.copy(alpha = 0.1f))
            .border(1.dp, Emerald.copy(alpha = 0.25f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Emerald,
            modifier = Modifier.size(28.dp)
        )
    }
}

@Composable
fun GradientButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Emerald,
            contentColor = Color.Black,
            disabledContainerColor = Emerald.copy(alpha = 0.3f),
            disabledContentColor = Color.Black.copy(alpha = 0.5f)
        ),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 8.dp
        )
    ) {
        Text(
            text,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DarkTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    Column {
        Text(
            label.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = TextMuted,
            letterSpacing = 2.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = TextMuted, fontSize = 14.sp) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Emerald.copy(alpha = 0.5f),
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                cursorColor = Emerald,
                focusedContainerColor = DarkBg,
                unfocusedContainerColor = DarkBg
            ),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType)
        )
    }
}

@Composable
fun InfoCard(icon: ImageVector, text: String, color: Color) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)),
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text,
                fontSize = 11.sp,
                color = color,
                lineHeight = 16.sp
            )
        }
    }
}

@Composable
fun StatusPill(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = color)
        Spacer(modifier = Modifier.height(2.dp))
        Text(label, fontSize = 10.sp, color = TextMuted)
    }
}
