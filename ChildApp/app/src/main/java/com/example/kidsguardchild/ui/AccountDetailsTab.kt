package com.example.kidsguardchild.ui

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.kidsguardchild.core.AccountPrefs
import com.example.kidsguardchild.core.ApiClient

private val DarkBg = Color(0xFF020617)
private val CardBg = Color(0xFF090D1F)
private val BorderColor = Color(0xFF1E293B)
private val Emerald = Color(0xFF10B981)
private val TextPrimary = Color(0xFFE5FFE5)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted = Color(0xFF64748B)
private val ErrorRed = Color(0xFFEF4444)

@Composable
fun AccountDetailsTab(onLogout: () -> Unit) {
    val context = LocalContext.current
    var details by remember { mutableStateOf(AccountPrefs.load(context)) }
    var editingField by remember { mutableStateOf<String?>(null) }
    var editValue by remember { mutableStateOf("") }
    var showLogoutDialog by remember { mutableStateOf(false) }

    fun reload() {
        details = AccountPrefs.load(context)
    }

    fun startEdit(fieldId: String, current: String) {
        editingField = fieldId
        editValue = current
    }

    fun saveField(fieldId: String) {
        when (fieldId) {
            "displayName" -> AccountPrefs.saveDisplayName(context, editValue)
            "fullName" -> AccountPrefs.saveFullName(context, editValue)
            "phone" -> AccountPrefs.savePhone(context, editValue)
            "email" -> AccountPrefs.saveEmail(context, editValue)
            "school" -> AccountPrefs.saveSchool(context, editValue)
            "notes" -> AccountPrefs.saveNotes(context, editValue)
            "serverUrl" -> {
                AccountPrefs.saveServerUrl(context, editValue)
                ApiClient.init(editValue, context)
            }
        }
        editingField = null
        reload()
        Toast.makeText(context, "Saved", Toast.LENGTH_SHORT).show()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            "Account Details",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )
        Text(
            "View and update this device's profile. Changes are saved on this phone.",
            fontSize = 11.sp,
            color = TextSecondary
        )

        AccountFieldCard(
            icon = Icons.Default.Badge,
            label = "Device display name",
            value = details.displayName,
            fieldId = "displayName",
            editable = true,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = { startEdit("displayName", details.displayName) },
            onEditValueChange = { editValue = it },
            onSave = { saveField("displayName") },
            onCancel = { editingField = null }
        )

        AccountFieldCard(
            icon = Icons.Default.Person,
            label = "Child full name",
            value = details.fullName,
            fieldId = "fullName",
            editable = true,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = { startEdit("fullName", details.fullName) },
            onEditValueChange = { editValue = it },
            onSave = { saveField("fullName") },
            onCancel = { editingField = null },
            placeholder = "e.g. Ahmed Khan"
        )

        AccountFieldCard(
            icon = Icons.Default.Phone,
            label = "Phone number",
            value = details.phone,
            fieldId = "phone",
            editable = true,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = { startEdit("phone", details.phone) },
            onEditValueChange = { editValue = it },
            onSave = { saveField("phone") },
            onCancel = { editingField = null },
            placeholder = "+92 300 1234567"
        )

        AccountFieldCard(
            icon = Icons.Default.Email,
            label = "Email",
            value = details.email,
            fieldId = "email",
            editable = true,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = { startEdit("email", details.email) },
            onEditValueChange = { editValue = it },
            onSave = { saveField("email") },
            onCancel = { editingField = null },
            placeholder = "child@email.com"
        )

        AccountFieldCard(
            icon = Icons.Default.School,
            label = "School / organization",
            value = details.school,
            fieldId = "school",
            editable = true,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = { startEdit("school", details.school) },
            onEditValueChange = { editValue = it },
            onSave = { saveField("school") },
            onCancel = { editingField = null },
            placeholder = "School name"
        )

        AccountFieldCard(
            icon = Icons.Default.Notes,
            label = "Notes",
            value = details.notes,
            fieldId = "notes",
            editable = true,
            multiline = true,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = { startEdit("notes", details.notes) },
            onEditValueChange = { editValue = it },
            onSave = { saveField("notes") },
            onCancel = { editingField = null },
            placeholder = "Optional notes"
        )

        AccountFieldCard(
            icon = Icons.Default.Dns,
            label = "Parent server URL",
            value = details.serverUrl,
            fieldId = "serverUrl",
            editable = true,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = { startEdit("serverUrl", details.serverUrl) },
            onEditValueChange = { editValue = it },
            onSave = { saveField("serverUrl") },
            onCancel = { editingField = null },
            placeholder = "https://your-app.vercel.app"
        )

        AccountFieldCard(
            icon = Icons.Default.Key,
            label = "Device ID (pairing token)",
            value = details.deviceId.ifBlank { "—" },
            fieldId = "deviceId",
            editable = false,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = {},
            onEditValueChange = {},
            onSave = {},
            onCancel = {}
        )

        AccountFieldCard(
            icon = Icons.Default.Schedule,
            label = "Paired at",
            value = details.pairedAt,
            fieldId = "pairedAt",
            editable = false,
            editingField = editingField,
            editValue = editValue,
            onStartEdit = {},
            onEditValueChange = {},
            onSave = {},
            onCancel = {}
        )

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = { showLogoutDialog = true },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = ErrorRed.copy(alpha = 0.15f),
                contentColor = ErrorRed
            ),
            border = BorderStroke(1.dp, ErrorRed.copy(alpha = 0.4f))
        ) {
            Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Log out", fontWeight = FontWeight.Bold)
        }

        Text(
            "Logging out stops monitoring and clears pairing. You will need to pair again.",
            fontSize = 10.sp,
            color = TextMuted,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            containerColor = CardBg,
            title = { Text("Log out?", color = TextPrimary) },
            text = {
                Text(
                    "Monitoring will stop and this device will be unlinked from the app. Continue?",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    onLogout()
                }) {
                    Text("Log out", color = ErrorRed, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}

@Composable
private fun AccountFieldCard(
    icon: ImageVector,
    label: String,
    value: String,
    fieldId: String,
    editable: Boolean,
    multiline: Boolean = false,
    placeholder: String = "",
    editingField: String?,
    editValue: String,
    onStartEdit: () -> Unit,
    onEditValueChange: (String) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit
) {
    val isEditing = editingField == fieldId

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        border = BorderStroke(1.dp, BorderColor),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(icon, contentDescription = null, tint = Emerald, modifier = Modifier.size(18.dp))
                Text(
                    label.uppercase(),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    letterSpacing = 1.sp,
                    modifier = Modifier.weight(1f)
                )
                if (editable && !isEditing) {
                    TextButton(
                        onClick = onStartEdit,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit", modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Edit", fontSize = 11.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (isEditing) {
                OutlinedTextField(
                    value = editValue,
                    onValueChange = onEditValueChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(placeholder, color = TextMuted, fontSize = 12.sp) },
                    singleLine = !multiline,
                    minLines = if (multiline) 3 else 1,
                    maxLines = if (multiline) 5 else 1,
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald.copy(alpha = 0.5f),
                        unfocusedBorderColor = BorderColor,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        cursorColor = Emerald,
                        focusedContainerColor = DarkBg,
                        unfocusedContainerColor = DarkBg
                    )
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onSave,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald, contentColor = Color.Black)
                    ) {
                        Text("Save", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = onCancel,
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.dp, BorderColor)
                    ) {
                        Text("Cancel", fontSize = 12.sp, color = TextMuted)
                    }
                }
            } else {
                Text(
                    text = value.ifBlank { "Not set" },
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (value.isBlank()) TextMuted else TextPrimary
                )
            }
        }
    }
}
