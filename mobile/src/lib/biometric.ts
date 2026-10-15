// Face ID / Touch ID as the last step of a co-signature: the slide says "I mean it", the biometric says "it's me". A phone
// without biometrics (or the web build) skips it, and says so under the slide. The hidden auto-play skips it too (the video
// is recorded without a face in front of the simulator).
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { autoplayRunning } from "./autoplayTargets";

export type BiometricResult = "ok" | "cancel" | "unavailable";

/** What the phone offers, for the line under the slide ("Then Face ID signs it"). null: nothing to ask. */
export async function biometricKind(): Promise<"Face ID" | "Touch ID" | "Fingerprint" | null> {
  if (Platform.OS === "web") return null;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return Platform.OS === "ios" ? "Face ID" : "Fingerprint";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    return null;
  } catch { return null; }
}

/** Ask for the owner's face or finger (device passcode as the fallback). */
export async function confirmOwner(reason: string): Promise<BiometricResult> {
  if (autoplayRunning() || !(await biometricKind())) return "unavailable";
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: "Cancel", disableDeviceFallback: false });
    return r.success ? "ok" : "cancel";
  } catch { return "cancel"; }
}
