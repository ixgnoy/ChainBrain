// One place for every haptic (design-system/chainbrain/pages/motion.md, "rich" level). Semantic names, iOS/Android only,
// throttled so two never fire within 50 ms, errors swallowed (Low Power Mode, camera on and the Settings switch disable the
// Taptic Engine). Haptics are never the only feedback. From worklets: scheduleOnRN(haptic.tick).
import { Platform } from "react-native";
import * as H from "expo-haptics";

const ok = Platform.OS === "ios" || Platform.OS === "android";
let last = 0;
const fire = (fn: () => Promise<void>, gap = 50) => {
  if (!ok) return;
  const now = Date.now();
  if (now - last < gap) return;
  last = now;
  fn().catch(() => {});
};
const impact = (s: H.ImpactFeedbackStyle) => () => fire(() => H.impactAsync(s));
const note = (t: H.NotificationFeedbackType) => () => fire(() => H.notificationAsync(t), 0);

export const haptic = {
  /** tab change, wizard step, chip / segment / slider step, slide and hold ticks */
  select: () => fire(() => H.selectionAsync(), 30),
  tick: () => fire(() => H.selectionAsync(), 30),
  /** button, row and card presses */
  light: impact(H.ImpactFeedbackStyle.Light),
  /** round actions, sheet snap landing, pull-to-refresh trigger, hold at 90 % */
  medium: impact(H.ImpactFeedbackStyle.Medium),
  /** sheet open, drag past the dismiss threshold */
  soft: impact(H.ImpactFeedbackStyle.Soft),
  /** slide-to-approve commit */
  rigid: impact(H.ImpactFeedbackStyle.Rigid),
  heavy: impact(H.ImpactFeedbackStyle.Heavy),
  /** funded, paid, saved */
  success: note(H.NotificationFeedbackType.Success),
  /** revoked, limit warnings */
  warning: note(H.NotificationFeedbackType.Warning),
  /** refusal, dead end, failure */
  error: note(H.NotificationFeedbackType.Error),
};
export type HapticName = keyof typeof haptic;
