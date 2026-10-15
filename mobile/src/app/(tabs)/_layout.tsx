// Tabs on expo-router's headless tabs: screens stay mounted (state kept), the entering screen slides in from the direction
// of travel, and the glass bar's highlight travels between tabs (scrub with a finger to switch).
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Tabs, TabList, TabSlot, TabTrigger } from "expo-router/ui";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { GlassTabBar, GlassTabButton, type GlassTabItem } from "../../ui/glass/GlassTabBar";
import { TabBarMinimizeProvider } from "../../ui/glass/minimize";
import { renderTabScreen } from "../../ui/glass/TabTransition";
import { AskDock } from "../../components/AskDock";

const ITEMS: (GlassTabItem & { href: string })[] = [
  { name: "index", href: "/", label: "Home", icon: "home" },
  { name: "agents", href: "/agents", label: "Agents", icon: "bot" },
  { name: "brain", href: "/brain", label: "Brain", icon: "brain" },
  { name: "activity", href: "/activity", label: "Activity", icon: "activity" },
  { name: "settings", href: "/settings", label: "Settings", icon: "settings" },
];

export default function TabsLayout() {
  const router = useRouter();
  const { pending } = useApp();
  return (
    <TabBarMinimizeProvider>
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Tabs>
          <TabSlot style={{ height: "100%" }} renderFn={renderTabScreen} />
          <TabList asChild>
            <GlassTabBar onIndexSelected={(i) => router.navigate(ITEMS[i].href as never)}>
              {ITEMS.map(({ href, ...item }, index) => (
                <TabTrigger key={item.name} name={item.name} href={href as never} asChild>
                  <GlassTabButton item={{ ...item, badge: item.name === "agents" && pending.length > 0 }} index={index} />
                </TabTrigger>
              ))}
            </GlassTabBar>
          </TabList>
        </Tabs>
        <AskDock />
      </View>
    </TabBarMinimizeProvider>
  );
}
