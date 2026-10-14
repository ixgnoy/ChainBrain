import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { InterTight_600SemiBold, InterTight_700Bold } from "@expo-google-fonts/inter-tight";
import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { ThemeProvider, useTheme } from "../theme";
import { AppProvider, useApp } from "../store";
import { Setup } from "../components/Setup";
import { ApprovalSheet } from "../components/ApprovalSheet";
import { QuestionSheet } from "../components/QuestionSheet";
import { ReceiptSheet } from "../components/ReceiptSheet";
import { ActionSheet } from "../components/ActionSheet";
import { RevokeFlash } from "../components/RevokeFlash";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { c, dark } = useTheme();
  const { keyState } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={dark ? "light" : "dark"} />
      {keyState === "none" ? (
        <Setup />
      ) : keyState === "loading" ? null : (
        <>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "slide_from_right" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="pocket/[id]" />
            <Stack.Screen name="create" options={{ presentation: Platform.OS === "web" ? undefined : "modal", animation: Platform.OS === "web" ? "fade" : undefined }} />
          </Stack>
          <ApprovalSheet />
          <QuestionSheet />
          <ReceiptSheet />
          <ActionSheet />
          <RevokeFlash />
        </>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, InterTight_600SemiBold, InterTight_700Bold, GeistMono_500Medium });
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050607", alignItems: "center" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 480 : undefined }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppProvider>
              <Shell />
            </AppProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
