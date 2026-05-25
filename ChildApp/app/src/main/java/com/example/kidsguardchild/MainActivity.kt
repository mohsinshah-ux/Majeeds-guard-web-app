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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.kidsguardchild.core.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// ─── Color Palette ────────────────────────────────────────────────────────────

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
        val savedUrl = prefs.getString("server_url", "") ?: ""
        val savedToken = prefs.getString("device_token", "") ?: ""
        val isPaired = prefs.getBoolean("is_paired", false)

        setContent {
            KidsGuardApp(
                savedUrl = savedUrl,
                savedToken = savedToken,
                isPaired = isPaired,
                onPaired = { url, token ->
                    prefs.edit()
                        .putString("server_url", url)
                        .putString("device_token", token)
                        .putString("device_id", token)
                        .putBoolean("is_paired", true)
                        .apply()
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

// ─── Root Composable ──────────────────────────────────────────────────────────

@Composable
fun KidsGuardApp(
    savedUrl: String,
    savedToken: String,
    isPaired: Boolean,
    onPaired: (String, String) -> Unit,
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
            ApiClient.init(savedUrl, this@MainActivity)
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
                            onPaired(serverUrl, pairingToken)
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
                    4 -> DashboardScreen()
                }
            }
        }
    }
}

// ─── Step 0: Splash Screen ───────────────────────────────────────────────────

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
            text = "Secure • Consented • Transparent",
            fontSize = 10.sp,
            color = TextMuted,
            letterSpacing = 2.sp
        )
    }
}

// ─── Step 1: Server Setup ────────────────────────────────────────────────────

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
            placeholder = "https://your-app.vercel.app",
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

// ─── Step 2: Pairing / Token Redeem ──────────────────────────────────────────

@Composable
fun PairingScreen(
    serverUrl: String,
    deviceName: String,
    token: String,
    onTokenChange: (String) -> Unit,
    onPaired: () -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

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
                        ApiClient.init(serverUrl, context)
                        val response = withContext(Dispatchers.IO) {
                            ApiClient.service.redeemInvite(
                                token,
                                RedeemBody(
                                    deviceName = deviceName.ifBlank { "Child's Phone" },
                                    consent = true
                                )
                            )
                        }
                        if (response.isSuccessful) {
                            onPaired()
                        } else {
                            val serverMsg = response.errorBody()?.string()
                                ?.let { body ->
                                    Regex(""""error"\s*:\s*"([^"]+)"""")
                                        .find(body)?.groupValues?.get(1)
                                }
                            val hint = when (response.code()) {
                                404 -> " Check Server URL is your Vercel site root (e.g. https://your-app.vercel.app), not a /bind/ page."
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
                        error = "Connection failed: ${e.message}"
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = token.isNotBlank() && !isLoading
        )

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(onClick = onBack) {
            Text("← Back to server setup", color = TextMuted, fontSize = 12.sp)
        }
    }
}

// ─── Step 3: Permission Wizard ───────────────────────────────────────────────

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
            "Grant each permission below. Monitoring uses only real device data — nothing is simulated.",
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

// ─── Step 4: Live Dashboard ──────────────────────────────────────────────────

@Composable
fun DashboardScreen() {
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
                    icon = { Icon(Icons.Default.Build, contentDescription = "Simulator") },
                    label = { Text("Simulator") },
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
                SimulatorTab()
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

@Composable
fun SimulatorTab() {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    // States for battery
    var batteryInput by remember { mutableFloatStateOf(50f) }

    // States for Location
    var locLat by remember { mutableStateOf("37.7749") }
    var locLng by remember { mutableStateOf("-122.4194") }
    var locPlace by remember { mutableStateOf("Golden Gate Park") }

    // States for Call Log
    var callContact by remember { mutableStateOf("Alex Mercer") }
    var callNumber by remember { mutableStateOf("+1-555-0199") }
    var callType by remember { mutableStateOf("Incoming") }
    var callDuration by remember { mutableStateOf("02:45") }

    // States for Message
    var msgFrom by remember { mutableStateOf("Sophia") }
    var msgChannel by remember { mutableStateOf("WhatsApp") }
    var msgPreview by remember { mutableStateOf("Are you coming to the secret party?") }

    // States for Social Chats
    var socialApp by remember { mutableStateOf("Instagram") }
    var socialContact by remember { mutableStateOf("lucas_swy") }
    var socialPreview by remember { mutableStateOf("Check out this link: cool-hacks.com") }

    // States for VoIP / App Call
    var appCallName by remember { mutableStateOf("Daniel") }
    var appCallPhone by remember { mutableStateOf("WhatsApp Audio Call") }
    var appCallType by remember { mutableStateOf("Incoming") }
    var appCallDuration by remember { mutableStateOf("05:12") }
    var appCallStatus by remember { mutableStateOf("Answered") }

    // States for Contacts
    var contactName by remember { mutableStateOf("Michael Scott") }
    var contactPhone by remember { mutableStateOf("+1-555-0147") }
    var contactMail by remember { mutableStateOf("mscott@dundermifflin.com") }
    var contactAddress by remember { mutableStateOf("1725 Slough Avenue, Scranton, PA") }
    var contactBlocked by remember { mutableStateOf(false) }

    // States for App Usage
    var usageApp by remember { mutableStateOf("TikTok") }
    var usageDuration by remember { mutableStateOf("1h 24m") }

    // States for Installed App
    var installAppName by remember { mutableStateOf("Telegram") }
    var installAppPkg by remember { mutableStateOf("org.telegram.messenger") }
    var installAppSize by remember { mutableStateOf("84 MB") }
    var installAppBlocked by remember { mutableStateOf(false) }

    // States for Browser History
    var browserQuery by remember { mutableStateOf("how to bypass parental lock") }
    var browserUrl by remember { mutableStateOf("https://google.com/search?q=bypass+parental+lock") }

    // States for Wifi Log
    var wifiSsid by remember { mutableStateOf("Starbucks_WiFi_Free") }
    var wifiStatus by remember { mutableStateOf("Connected") }
    var wifiSignal by remember { mutableStateOf("Strong") }

    // States for Safety Alert
    var alertType by remember { mutableStateOf("Geofence") }
    var alertSeverity by remember { mutableStateOf("Warning") }
    var alertMsg by remember { mutableStateOf("Child exited school geofence area") }

    // States for Photos
    var photoTitle by remember { mutableStateOf("Simulated Screen Capture") }
    var photoUrl by remember { mutableStateOf("https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=400&q=80") }

    // States for Keylogger
    var keylogApp by remember { mutableStateOf("Chrome") }
    var keylogText by remember { mutableStateOf("i hate parental controls") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            "DEVELOPER DATA SIMULATOR",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )
        Text(
            "Simulate and push telemetry data directly to the Parental Control dashboard server to test client-server integration instantly.",
            fontSize = 11.sp,
            color = TextSecondary
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(BorderColor)
        )

        // 1. Battery
        SimulatorCard(
            title = "🔋 Battery Percentage Simulator",
            buttonText = "Send Battery Level",
            onSimulate = {
                scope.launch {
                    val lvl = batteryInput.toInt()
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postBattery(BatteryBody(lvl))
                    }
                    showToast(context, if (res.isSuccessful) "Battery $lvl% sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Battery Level: ${batteryInput.toInt()}%", fontSize = 12.sp, color = TextPrimary)
                }
                Slider(
                    value = batteryInput,
                    onValueChange = { batteryInput = it },
                    valueRange = 0f..100f,
                    colors = SliderDefaults.colors(
                        thumbColor = Emerald,
                        activeTrackColor = Emerald,
                        inactiveTrackColor = BorderColor
                    )
                )
            }
        }

        // 2. Location
        SimulatorCard(
            title = "📍 Location / GPS Simulator",
            buttonText = "Send Location Update",
            onSimulate = {
                scope.launch {
                    val latVal = locLat.toDoubleOrNull() ?: 0.0
                    val lngVal = locLng.toDoubleOrNull() ?: 0.0
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postLocation(LocationBody(latVal, lngVal, locPlace))
                    }
                    showToast(context, if (res.isSuccessful) "Location sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = locLat, onValueChange = { locLat = it }, label = "Latitude", placeholder = "37.7749")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = locLng, onValueChange = { locLng = it }, label = "Longitude", placeholder = "-122.4194")
                    }
                }
                DarkTextFieldCompact(value = locPlace, onValueChange = { locPlace = it }, label = "Place / Street Name", placeholder = "Golden Gate Park")
            }
        }

        // 3. Call Log
        SimulatorCard(
            title = "📞 Cellular Call Log Simulator",
            buttonText = "Send Call Log",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postCallLog(CallLogBody(callContact, callNumber, callType, callDuration))
                    }
                    showToast(context, if (res.isSuccessful) "Call log sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DarkTextFieldCompact(value = callContact, onValueChange = { callContact = it }, label = "Contact Name", placeholder = "Alex Mercer")
                DarkTextFieldCompact(value = callNumber, onValueChange = { callNumber = it }, label = "Phone Number", placeholder = "+1-555-0199")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = callType, onValueChange = { callType = it }, label = "Type (Incoming/Outgoing/Missed)", placeholder = "Incoming")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = callDuration, onValueChange = { callDuration = it }, label = "Duration (MM:SS)", placeholder = "02:45")
                    }
                }
            }
        }

        // 4. SMS / Message
        SimulatorCard(
            title = "💬 SMS / Direct Message Simulator",
            buttonText = "Send Message",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postMessage(MessageBody(msgFrom, msgChannel, msgPreview))
                    }
                    showToast(context, if (res.isSuccessful) "Message sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = msgFrom, onValueChange = { msgFrom = it }, label = "Sender", placeholder = "Sophia")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = msgChannel, onValueChange = { msgChannel = it }, label = "Channel (SMS/WhatsApp)", placeholder = "WhatsApp")
                    }
                }
                DarkTextFieldCompact(value = msgPreview, onValueChange = { msgPreview = it }, label = "Message Content", placeholder = "Are you there?")
            }
        }

        // 5. Social Chats
        SimulatorCard(
            title = "📱 Social App Chat Simulator",
            buttonText = "Send Social Chat",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postSocialChat(SocialChatBody(socialApp, socialContact, socialPreview))
                    }
                    showToast(context, if (res.isSuccessful) "Social chat sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = socialApp, onValueChange = { socialApp = it }, label = "Social App", placeholder = "Instagram")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = socialContact, onValueChange = { socialContact = it }, label = "Contact Handle", placeholder = "lucas_swy")
                    }
                }
                DarkTextFieldCompact(value = socialPreview, onValueChange = { socialPreview = it }, label = "Last Message Preview", placeholder = "Check this link")
            }
        }

        // 6. VoIP / App Call
        SimulatorCard(
            title = "🔊 VoIP / App Call Simulator",
            buttonText = "Send VoIP Call",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postAppCall(
                            AppCallBody(
                                name = appCallName,
                                phone = appCallPhone,
                                app = appCallPhone,
                                type = appCallType,
                                duration = appCallDuration,
                                status = appCallStatus
                            )
                        )
                    }
                    showToast(context, if (res.isSuccessful) "VoIP Call sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = appCallName, onValueChange = { appCallName = it }, label = "Name", placeholder = "Daniel")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = appCallPhone, onValueChange = { appCallPhone = it }, label = "App / Phone", placeholder = "WhatsApp Audio Call")
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = appCallType, onValueChange = { appCallType = it }, label = "Type", placeholder = "Incoming")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = appCallDuration, onValueChange = { appCallDuration = it }, label = "Duration", placeholder = "05:12")
                    }
                }
                DarkTextFieldCompact(value = appCallStatus, onValueChange = { appCallStatus = it }, label = "Status", placeholder = "Answered")
            }
        }

        // 7. Browser History
        SimulatorCard(
            title = "🌐 Browser Search & URL Simulator",
            buttonText = "Send History Entry",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postBrowserHistory(BrowserHistoryBody(browserQuery, browserUrl))
                    }
                    showToast(context, if (res.isSuccessful) "Browser entry sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DarkTextFieldCompact(value = browserQuery, onValueChange = { browserQuery = it }, label = "Search Query / Page Title", placeholder = "how to bypass parental lock")
                DarkTextFieldCompact(value = browserUrl, onValueChange = { browserUrl = it }, label = "URL", placeholder = "https://google.com/...")
            }
        }

        // 8. Keylogger
        SimulatorCard(
            title = "⌨️ Keylogger Keystroke Simulator",
            buttonText = "Send Keystroke Record",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postKeylog(KeylogBody(keylogApp, keylogText))
                    }
                    showToast(context, if (res.isSuccessful) "Keylog sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DarkTextFieldCompact(value = keylogApp, onValueChange = { keylogApp = it }, label = "Active App", placeholder = "Chrome")
                DarkTextFieldCompact(value = keylogText, onValueChange = { keylogText = it }, label = "Typed Keyboard Text", placeholder = "i hate parental controls")
            }
        }

        // 9. Safety Alert
        SimulatorCard(
            title = "⚠️ Safety System Alert Simulator",
            buttonText = "Send System Alert",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postSafetyAlert(SafetyAlertBody(alertType, alertSeverity, alertMsg))
                    }
                    showToast(context, if (res.isSuccessful) "Safety alert sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = alertType, onValueChange = { alertType = it }, label = "Alert Type", placeholder = "Geofence")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = alertSeverity, onValueChange = { alertSeverity = it }, label = "Severity (Info/Warning/Danger)", placeholder = "Warning")
                    }
                }
                DarkTextFieldCompact(value = alertMsg, onValueChange = { alertMsg = it }, label = "Alert message details", placeholder = "Child exited school area")
            }
        }

        // 10. Installed Apps
        SimulatorCard(
            title = "📦 Installed Application Simulator",
            buttonText = "Send Installed App",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postInstalledApp(InstalledAppBody(installAppName, installAppPkg, installAppSize, installAppBlocked))
                    }
                    showToast(context, if (res.isSuccessful) "Installed app report sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DarkTextFieldCompact(value = installAppName, onValueChange = { installAppName = it }, label = "Application Name", placeholder = "Telegram")
                DarkTextFieldCompact(value = installAppPkg, onValueChange = { installAppPkg = it }, label = "Package Name ID", placeholder = "org.telegram.messenger")
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = installAppSize, onValueChange = { installAppSize = it }, label = "App Disk Size", placeholder = "84 MB")
                    }
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.End
                    ) {
                        Text("Blocked:", fontSize = 11.sp, color = TextMuted)
                        Checkbox(
                            checked = installAppBlocked,
                            onCheckedChange = { installAppBlocked = it },
                            colors = CheckboxDefaults.colors(checkedColor = Emerald, uncheckedColor = BorderColor)
                        )
                    }
                }
            }
        }

        // 11. Photos
        SimulatorCard(
            title = "🖼️ Screenshot / Gallery Photo Simulator",
            buttonText = "Send Simulated Screenshot",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postPhoto(PhotoBody(photoUrl, photoTitle))
                    }
                    showToast(context, if (res.isSuccessful) "Photo uploaded successfully!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DarkTextFieldCompact(value = photoTitle, onValueChange = { photoTitle = it }, label = "Photo Title / Caption", placeholder = "Simulated Screen Capture")
                DarkTextFieldCompact(value = photoUrl, onValueChange = { photoUrl = it }, label = "Direct Image URL", placeholder = "https://images.unsplash.com/photo-...")
            }
        }

        // 12. App Usage
        SimulatorCard(
            title = "📊 App Screen Time Usage Simulator",
            buttonText = "Send Usage Stat",
            onSimulate = {
                scope.launch {
                    val colors = listOf("#25D366", "#FF0000", "#000000", "#1877F2")
                    val clr = colors[Math.abs(usageApp.hashCode()) % colors.size]
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postUsageStat(UsageStatBody(usageApp, usageDuration, usageApp.take(1), clr))
                    }
                    showToast(context, if (res.isSuccessful) "Usage statistics sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = usageApp, onValueChange = { usageApp = it }, label = "App Name", placeholder = "TikTok")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = usageDuration, onValueChange = { usageDuration = it }, label = "Time Spent (Hh Mm)", placeholder = "1h 24m")
                    }
                }
            }
        }

        // 13. Contacts
        SimulatorCard(
            title = "📇 Address Book Contacts Simulator",
            buttonText = "Send Contact Record",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postContact(ContactBody(contactName, contactPhone, contactMail, contactAddress, contactBlocked))
                    }
                    showToast(context, if (res.isSuccessful) "Contact record sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DarkTextFieldCompact(value = contactName, onValueChange = { contactName = it }, label = "Full Name", placeholder = "Michael Scott")
                DarkTextFieldCompact(value = contactPhone, onValueChange = { contactPhone = it }, label = "Phone Number", placeholder = "+1-555-0147")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = contactMail, onValueChange = { contactMail = it }, label = "Email (Optional)", placeholder = "mscott@dundermifflin.com")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = contactAddress, onValueChange = { contactAddress = it }, label = "Address (Optional)", placeholder = "Scranton, PA")
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Mark Blocked:", fontSize = 11.sp, color = TextMuted)
                    Spacer(modifier = Modifier.width(6.dp))
                    Checkbox(
                        checked = contactBlocked,
                        onCheckedChange = { contactBlocked = it },
                        colors = CheckboxDefaults.colors(checkedColor = Emerald, uncheckedColor = BorderColor)
                    )
                }
            }
        }

        // 14. Wi-Fi Connection
        SimulatorCard(
            title = "📶 Wi-Fi Connection Log Simulator",
            buttonText = "Send Wi-Fi Log",
            onSimulate = {
                scope.launch {
                    val res = withContext(Dispatchers.IO) {
                        ApiClient.service.postWifiLog(WifiLogBody(wifiSsid, wifiStatus, wifiSignal))
                    }
                    showToast(context, if (res.isSuccessful) "Wi-Fi connection log sent!" else "Failed: ${res.code()}")
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DarkTextFieldCompact(value = wifiSsid, onValueChange = { wifiSsid = it }, label = "Network SSID", placeholder = "Starbucks_WiFi_Free")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = wifiStatus, onValueChange = { wifiStatus = it }, label = "Status (Connected/Disconnected)", placeholder = "Connected")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        DarkTextFieldCompact(value = wifiSignal, onValueChange = { wifiSignal = it }, label = "Signal Strength (Strong/Medium/Weak)", placeholder = "Strong")
                    }
                }
            }
        }
    }
}

@Composable
fun SimulatorCard(
    title: String,
    buttonText: String,
    onSimulate: () -> Unit,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        border = BorderStroke(1.dp, BorderColor),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = Emerald
            )
            Spacer(modifier = Modifier.height(10.dp))
            content()
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onSimulate,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(36.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Emerald.copy(alpha = 0.15f),
                    contentColor = Emerald
                ),
                border = BorderStroke(1.dp, Emerald.copy(alpha = 0.3f))
            ) {
                Text(buttonText, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DarkTextFieldCompact(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String
) {
    Column {
        Text(
            label.uppercase(),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = TextMuted,
            letterSpacing = 1.sp
        )
        Spacer(modifier = Modifier.height(3.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = TextMuted, fontSize = 11.sp) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(8.dp),
            textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Emerald.copy(alpha = 0.4f),
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                cursorColor = Emerald,
                focusedContainerColor = DarkBg,
                unfocusedContainerColor = DarkBg
            )
        )
    }
}

fun showToast(context: Context, msg: String) {
    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
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

// ─── Shared UI Components ────────────────────────────────────────────────────

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
