// A local notification when an agent asks for a co-signature while ChainBrain is in the background ("Claude asks to pay
// HK$0.40 to Nansen"); tapping it opens that request. Opt-in: the cheque offers it once, with the reason, before iOS asks.
// Web: no notifications.
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

const web = Platform.OS === "web";

export type NotifyPermission = "granted" | "denied" | "undetermined" | "unsupported";

export async function notifyPermission(): Promise<NotifyPermission> {
  if (web) return "unsupported";
  try { return (await Notifications.getPermissionsAsync()).status as NotifyPermission; } catch { return "unsupported"; }
}

export async function askNotifyPermission(): Promise<NotifyPermission> {
  if (web) return "unsupported";
  try { return (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })).status as NotifyPermission; } catch { return "unsupported"; }
}

/** Post the ask now if the app is not in front (in front, the ask dock already shows it). */
export async function notifyAsk(id: string, title: string, body: string) {
  if (web || AppState.currentState === "active") return;
  if ((await notifyPermission()) !== "granted") return;
  try { await Notifications.scheduleNotificationAsync({ content: { title, body, data: { approval: id }, sound: true }, trigger: null }); } catch { /* best effort */ }
}

/** Call `open(approvalId)` when the owner taps one of these notifications. Returns the unsubscribe. */
export function onAskOpened(open: (id: string) => void): () => void {
  if (web) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const id = r.notification.request.content.data?.approval;
    if (typeof id === "string") open(id);
  });
  return () => sub.remove();
}
