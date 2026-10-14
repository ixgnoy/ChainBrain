import React from "react";
import { Tabs } from "expo-router";
import { TabBar } from "../../ui/TabBar";
import { TabBarMinimizeProvider } from "../../ui/minimize";

export default function TabsLayout() {
  return (
    <TabBarMinimizeProvider>
      <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}>
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="agent" options={{ title: "Agent" }} />
        <Tabs.Screen name="activity" options={{ title: "Activity" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
    </TabBarMinimizeProvider>
  );
}
