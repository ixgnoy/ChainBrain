// Tabs on expo-router's headless tabs: screens stay mounted (state kept), the entering screen slides in from the direction
// of travel, and the glass bar's highlight travels between tabs (scrub with a finger to switch).
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Tabs, TabList, TabSlot, TabTrigger } from "expo-router/ui";
import { useAppSelect } from "../../store";
import { c } from "../../tokens";
import { GlassTabBar, GlassTabButton, type GlassTabItem } from "../../ui/glass/GlassTabBar";
import { TabBarMinimizeProvider } from "../../ui/glass/minimize";
import { renderTabScreen } from "../../ui/glass/TabTransition";

const ITEMS: (GlassTabItem & { href: string })[] = [
  { name: "index", href: "/", label: "Home", icon: "home" },
  { name: "agents", href: "/agents", label: "Agents", icon: "bot" },
  { name: "brain", href: "/brain", label: "Brain", icon: "brain" },
  { name: "activity", href: "/activity", label: "Activity", icon: "activity" },
  { name: "settings", href: "/settings", label: "Settings", icon: "settings" },
];

/** Mount the tabs not yet opened, one at a time while the app is idle, so a first visit to Brain or Activity shows at once
 *  instead of building the whole screen under the finger. Out of view it stays paused (no store re-renders). */
function useWarmTabs() {
  const [warm, setWarm] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const rest = ITEMS.map((i) => i.name).filter((n) => n !== "index");
    let t: ReturnType<typeof setTimeout> | undefined;
    let idle: number | undefined;
    const next = () => {
      const name = rest.shift();
      if (!name) return;
      idle = requestIdleCallback(() => { setWarm((w) => new Set(w).add(name)); t = setTimeout(next, 700); }, { timeout: 4000 });
    };
    t = setTimeout(next, 2500); // after Home's entrance and the first event read
    return () => { if (t) clearTimeout(t); if (idle !== undefined) cancelIdleCallback(idle); };
  }, []);
  return warm;
}

export default function TabsLayout() {
  const router = useRouter();
  const pending = useAppSelect((s) => s.pending);
  const warm = useWarmTabs();
  return (
    <TabBarMinimizeProvider>
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Tabs>
          <TabSlot style={{ height: "100%" }} renderFn={(d, o) => renderTabScreen(d, o, warm)} />
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
      </View>
    </TabBarMinimizeProvider>
  );
}
