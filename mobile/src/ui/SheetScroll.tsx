// A scroll view that cooperates with Sheet: the sheet drag takes over only from the top of the content (pull down), the list
// scrolls otherwise, and scrolling is locked while the sheet is displaced. Outside a sheet it is a plain scroll view.
import React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { GestureDetector, ScrollView as GHScrollView } from "react-native-gesture-handler";
import Animated, { useAnimatedProps, useAnimatedScrollHandler } from "react-native-reanimated";
import { useSheetCtx } from "./Sheet";

const AScroll = Animated.createAnimatedComponent(GHScrollView);

export function SheetScroll({ children, style, onContentSizeChange, onLayout, ...p }: ScrollViewProps) {
  const ctx = useSheetCtx();
  const box = React.useRef({ h: 0, c: 0 });
  const sync = () => { if (ctx) ctx.scrollable.value = box.current.c > box.current.h + 1; };
  // worklets capture only the shared values: `ctx` also holds the NativeGesture, which Worklets cannot copy to the UI thread
  const scrollY = ctx?.scrollY;
  const y = ctx?.y;
  const onScroll = useAnimatedScrollHandler((e) => { if (scrollY) scrollY.value = e.contentOffset.y; });
  const lock = useAnimatedProps(() => ({ scrollEnabled: y ? y.value <= 0.5 : true }));
  if (!ctx) return <ScrollView style={[{ flexGrow: 0 }, style]} {...p}>{children}</ScrollView>;
  return (
    <GestureDetector gesture={ctx.native}>
      <AScroll
        {...(p as object)}
        style={[{ flexGrow: 0, flexShrink: 1 }, style]}
        animatedProps={lock}
        bounces={false} overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={(e) => { box.current.h = e.nativeEvent.layout.height; sync(); onLayout?.(e); }}
        onContentSizeChange={(w, h) => { box.current.c = h; sync(); onContentSizeChange?.(w, h); }}
      >
        {children}
      </AScroll>
    </GestureDetector>
  );
}
