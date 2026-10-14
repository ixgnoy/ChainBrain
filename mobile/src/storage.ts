// Key-value storage: expo-secure-store on native, localStorage on web (demo only, unencrypted).
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";
const ls = (): Storage | null => {
  try { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; } catch { return null; }
};

export async function getItem(key: string): Promise<string | null> {
  try { return isWeb ? ls()?.getItem(key) ?? null : await SecureStore.getItemAsync(key); } catch { return null; }
}
export async function setItem(key: string, value: string): Promise<void> {
  try { if (isWeb) ls()?.setItem(key, value); else await SecureStore.setItemAsync(key, value); } catch { /* storage unavailable */ }
}
export async function deleteItem(key: string): Promise<void> {
  try { if (isWeb) ls()?.removeItem(key); else await SecureStore.deleteItemAsync(key); } catch { /* ignore */ }
}
