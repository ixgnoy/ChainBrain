// Face ID / Touch ID as the last step of a co-signature: the slide says "I mean it", the biometric says "it's me". A phone
// without biometrics (or the web build) skips it, and says so under the slide. The hidden auto-play skips it too (the video
// is recorded without a face in front of the simulator). Inside Expo Go, iOS can't use Face ID for us (Expo Go's own Info.plist
// has no Face ID usage text, so iOS asks for the passcode instead), and the copy says "your passcode" there; a development
// build reads ChainBrain's app.json and gets real Face ID.
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import { autoplayRunning } from "./autoplayTargets";

export type BiometricResult = "ok" | "cancel" | "unavailable";
export type OwnerCheck = "Face ID" | "Touch ID" | "Fingerprint" | "your passcode";

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** What the phone will actually ask for, for the line under the slide ("Then Face ID signs it"). null: nothing to ask. */
export async function biometricKind(): Promise<OwnerCheck | null> {
  if (Platform.OS === "web") return null;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return Platform.OS === "ios" ? (inExpoGo ? "your passcode" : "Face ID") : "Fingerprint";
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
