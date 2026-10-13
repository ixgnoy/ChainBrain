package net.chainbrain.wallet.ui

import android.provider.Settings
import androidx.annotation.DrawableRes
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.clickable

enum class Kind { Primary, Ghost, Danger }

/** Android's "Remove animations" (animator scale 0) is the reduced-motion setting. */
@Composable
fun reduceMotion(): Boolean {
    val ctx = LocalContext.current
    return remember { Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
}

@Composable
fun CbCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val p = LocalPalette.current
    Column(
        modifier.fillMaxWidth().padding(bottom = 12.dp).clip(RoundedCornerShape(16.dp)).background(p.card)
            .border(1.dp, p.line, RoundedCornerShape(16.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp), content = content,
    )
}

@Composable
fun T(text: String, modifier: Modifier = Modifier, muted: Boolean = false, bold: Boolean = false, big: Boolean = false, mono: Boolean = false, color: Color? = null, size: Int? = null) {
    val p = LocalPalette.current
    Text(
        text, modifier,
        color = color ?: if (muted) p.muted else p.text,
        fontFamily = if (big || mono) GeistMono else Geist,
        fontWeight = when { big -> FontWeight.SemiBold; mono -> FontWeight.Medium; bold -> FontWeight.SemiBold; else -> FontWeight.Normal },
        fontSize = (size ?: when { big -> 30; muted -> 13; mono -> 13; else -> 15 }).sp,
        lineHeight = (when { big -> 38; muted -> 18; mono -> 19; else -> 21 }).sp,
        letterSpacing = if (big) (-0.5).sp else 0.sp,
    )
}

@Composable
fun Btn(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, kind: Kind = Kind.Primary, enabled: Boolean = true, @DrawableRes icon: Int? = null) {
    val p = LocalPalette.current
    val src = remember { MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed && !reduceMotion()) 0.98f else 1f, label = "press")
    val bg = when (kind) { Kind.Primary -> p.accent; Kind.Danger -> p.danger; Kind.Ghost -> Color.Transparent }
    val fg = when (kind) { Kind.Primary -> p.accentText; Kind.Danger -> Color(0xFFFAFAFA); Kind.Ghost -> p.text }
    val shape = RoundedCornerShape(999.dp)
    Row(
        modifier.scale(scale).fillMaxWidth().heightIn(min = 46.dp).clip(shape).background(if (enabled) bg else bg.copy(alpha = bg.alpha * 0.5f))
            .then(if (kind == Kind.Ghost) Modifier.border(BorderStroke(1.dp, p.line), shape) else Modifier)
            .clickable(interactionSource = src, indication = null, enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 11.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        val c = if (enabled) fg else fg.copy(alpha = 0.5f)
        if (icon != null) { Icon(painterResource(icon), null, Modifier.size(18.dp), tint = c); Spacer(Modifier.width(8.dp)) }
        Text(label, color = c, fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1)
    }
}

@Composable
fun Field(value: String, onChange: (String) -> Unit, label: String, placeholder: String, secret: Boolean = false, pill: Boolean = false, onDone: (() -> Unit)? = null) {
    val p = LocalPalette.current
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (label.isNotEmpty()) T(label, bold = true, size = 14)
        BasicTextField(
            value, onChange, singleLine = true,
            textStyle = TextStyle(color = p.text, fontFamily = Geist, fontSize = 15.sp),
            cursorBrush = SolidColor(p.accent),
            visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(autoCorrectEnabled = false),
            keyboardActions = KeyboardActions(onDone = { onDone?.invoke() }, onSend = { onDone?.invoke() }),
            modifier = Modifier.fillMaxWidth(),
            decorationBox = { inner ->
                val shape = RoundedCornerShape(if (pill) 999.dp else 10.dp)
                androidx.compose.foundation.layout.Box(Modifier.fillMaxWidth().heightIn(min = 46.dp).clip(shape).background(p.sunken).border(1.dp, p.line, shape).padding(horizontal = if (pill) 16.dp else 12.dp, vertical = 12.dp)) {
                    if (value.isEmpty()) T(placeholder, muted = true, size = 15)
                    inner()
                }
            },
        )
    }
}

@Composable
fun Badge(text: String, danger: Boolean) {
    val p = LocalPalette.current
    T(text, Modifier.clip(RoundedCornerShape(999.dp)).background(if (danger) p.dangerSoft else p.accentSoft).padding(horizontal = 10.dp, vertical = 2.dp),
        bold = true, size = 12, color = if (danger) p.danger else p.accent)
}
