import "../../global.css";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { colorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { c } from "../tokens";
import { AppProvider, useApp } from "../store";
import { ApprovalSheet } from "../components/ApprovalSheet";
import { QuestionSheet } from "../components/QuestionSheet";
import { PocketPickerSheet } from "../components/PocketPickerSheet";
import { ReceiptSheet } from "../components/ReceiptSheet";
import { ActionSheet } from "../components/ActionSheet";
import { RulesSheet } from "../components/RulesSheet";
import { ToastHost } from "../ui/Toast";
import { Intro } from "../components/Intro";
import { CardFlightHost } from "../components/CardFlight";
import { ExplorerSheet } from "../components/ExplorerSheet";
import { T } from "../ui/Text";

SplashScreen.preventAutoHideAsync().catch(() => {});
// Light only: ignore the system colour scheme.
colorScheme.set("light");

function Shell() {
  const { keyState } = useApp();
  const [intro, setIntro] = useState(true); // the intro plays on every launch
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style="dark" />
      {keyState === "loading" ? null : keyState === "none" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <T v="body" color="ink2" style={{ textAlign: "center" }}>This device could not create a secure key. Please restart the app.</T>
        </View>
      ) : (
        <>
          {/* iOS: native push (UINavigationController slide, parallax, full-width swipe back) and the native card-stack modal for the wizard.
              Android: slide from right. Web: slide for the pocket page, fade for the wizard. */}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas }, animation: Platform.OS === "ios" ? "default" : "slide_from_right" }}>
            <Stack.Screen name="(tabs)" />
            {/* fade: the pocket page's card arrives by the card flight (components/CardFlight.tsx), not by sliding in */}
            <Stack.Screen name="pocket/[id]" options={{ animation: "fade", gestureEnabled: true, fullScreenGestureEnabled: Platform.OS === "ios" }} />
            <Stack.Screen name="create" options={{ presentation: Platform.OS === "web" ? undefined : "modal", animation: Platform.OS === "web" ? "fade" : Platform.OS === "ios" ? "default" : "slide_from_bottom", gestureEnabled: true }} />
          </Stack>
          <CardFlightHost />
          <ApprovalSheet />
          <QuestionSheet />
          <ReceiptSheet />
          <ActionSheet />
          <RulesSheet />
          <PocketPickerSheet />
          <ExplorerSheet />
          <ToastHost />
          {intro ? <Intro onDone={() => setIntro(false)} /> : null}
        </>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      {/* on web the app is a 480 px phone column on the same grey canvas */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.canvas, alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 480 : undefined }}>
          <AppProvider>
            <Shell />
          </AppProvider>
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
