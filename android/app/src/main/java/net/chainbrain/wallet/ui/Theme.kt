package net.chainbrain.wallet.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import net.chainbrain.wallet.R

// Same tokens as web/src/index.css and mobile/src/ui.tsx: zinc neutrals, one emerald accent.
@Immutable
data class Palette(
    val bg: Color, val card: Color, val sunken: Color, val text: Color, val muted: Color, val line: Color,
    val accent: Color, val accentSoft: Color, val accentText: Color, val danger: Color, val dangerSoft: Color, val warn: Color, val warnBg: Color,
)

val Light = Palette(
    bg = Color(0xFFF4F4F5), card = Color(0xFFFCFCFC), sunken = Color(0xFFECECEE), text = Color(0xFF18181B), muted = Color(0xFF5F5F68), line = Color(0xFFDEDEE2),
    accent = Color(0xFF0B7A57), accentSoft = Color(0xFFE3F3EC), accentText = Color(0xFFFAFAFA), danger = Color(0xFFB42318), dangerSoft = Color(0xFFFDECEA),
    warn = Color(0xFF8A4B00), warnBg = Color(0xFFFFF3E0),
)
val Dark = Palette(
    bg = Color(0xFF0C0C0E), card = Color(0xFF151518), sunken = Color(0xFF1D1D21), text = Color(0xFFECECEE), muted = Color(0xFFA1A1AA), line = Color(0xFF2A2A30),
    accent = Color(0xFF34C38F), accentSoft = Color(0xFF10291F), accentText = Color(0xFF0C0C0E), danger = Color(0xFFF2766B), dangerSoft = Color(0xFF2C1513),
    warn = Color(0xFFF5B25C), warnBg = Color(0xFF2A1F10),
)

val Geist = FontFamily(Font(R.font.geist_regular, FontWeight.Normal), Font(R.font.geist_semibold, FontWeight.SemiBold))
val GeistMono = FontFamily(Font(R.font.geist_mono_medium, FontWeight.Medium), Font(R.font.geist_mono_semibold, FontWeight.SemiBold))

val LocalPalette = staticCompositionLocalOf { Light }

@Composable
fun ChainBrainTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val p = if (dark) Dark else Light
    val scheme = if (dark) darkColorScheme(primary = p.accent, onPrimary = p.accentText, background = p.bg, surface = p.card, onSurface = p.text, error = p.danger)
    else lightColorScheme(primary = p.accent, onPrimary = p.accentText, background = p.bg, surface = p.card, onSurface = p.text, error = p.danger)
    androidx.compose.runtime.CompositionLocalProvider(LocalPalette provides p) {
        MaterialTheme(colorScheme = scheme, content = content)
    }
}
