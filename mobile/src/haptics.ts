import { Platform } from "react-native";
import * as H from "expo-haptics";

const ok = Platform.OS === "ios" || Platform.OS === "android";
const safe = (fn: () => Promise<void>) => { if (ok) fn().catch(() => {}); };

export const haptic = {
  select: () => safe(() => H.selectionAsync()),
  light: () => safe(() => H.impactAsync(H.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => H.impactAsync(H.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => H.impactAsync(H.ImpactFeedbackStyle.Heavy)),
  success: () => safe(() => H.notificationAsync(H.NotificationFeedbackType.Success)),
  warning: () => safe(() => H.notificationAsync(H.NotificationFeedbackType.Warning)),
  error: () => safe(() => H.notificationAsync(H.NotificationFeedbackType.Error)),
};
