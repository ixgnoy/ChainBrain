// Tabs on expo-router's headless tabs: screens stay mounted (state kept), the entering screen slides in from the direction
// of travel, and the glass bar's highlight travels between tabs (scrub with a finger to switch).
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useIsFocused, useNavigation, useRouter } from "expo-router";
import { Tabs, TabList, TabSlot, TabTrigger } from "expo-router/ui";
import { useAppSelect } from "../../store";
import { c } from "../../tokens";
import { GlassTabBar, GlassTabButton, type GlassTabItem } from "../../ui/glass/GlassTabBar";
import { renderTabScreen } from "../../ui/glass/TabTransition";

const ITEMS: (GlassTabItem & { href: string })[] = [
  { name: "index", href: "/", label: "Home", icon: "home" },
  { name: "agents", href: "/agents", label: "Agents", icon: "bot" },
  { name: "live", href: "/live", label: "Live", icon: "activity" },
  { name: "activity", href: "/activity", label: "Activity", icon: "receipt" },
  { name: "settings", href: "/settings", label: "Settings", icon: "settings" },
];

/** Mount the tabs not yet opened, one at a time while the app is idle, so a first visit to Live or Activity shows at once
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
  // a screen pushed or presented over the tabs (the wizard's modal sheet slides up for a moment with the bar still under
  // the finger): the bar takes no touches until the tabs are on top again. A tab tapped mid-presentation popped the modal
  // before iOS finished presenting it, which left the tabs stuck in the scaled-back "behind a sheet" frame.
  const focused = useIsFocused();
  const navigation = useNavigation();
  return (
    // the minimize state (TabBarMinimizeProvider) lives in the root layout: the ask dock, drawn above the stack, reads it too
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Tabs>
          <TabSlot style={{ height: "100%" }} renderFn={(d, o) => renderTabScreen(d, o, warm, !focused)} />
          <TabList asChild>
            <GlassTabBar enabled={focused} onIndexSelected={(i) => {
              // read at the moment of the tap: a push that just started has not re-rendered `focused` yet
              if (!navigation.isFocused()) return false;
              router.navigate(ITEMS[i].href as never);
            }}>
              {ITEMS.map(({ href, ...item }, index) => (
                <TabTrigger key={item.name} name={item.name} href={href as never} asChild>
                  <GlassTabButton item={{ ...item, badge: item.name === "agents" && pending.length > 0 }} index={index} />
                </TabTrigger>
              ))}
            </GlassTabBar>
          </TabList>
        </Tabs>
      </View>
  );
}
