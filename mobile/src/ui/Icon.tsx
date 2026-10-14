// Lucide icons (1.75 stroke) behind the app's small icon vocabulary.
import React from "react";
import {
  Activity, ArrowDownLeft, ArrowUp, Bell, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Globe, House, KeyRound, Layers, Lock, MessageCircle,
  MoreHorizontal, Plus, RefreshCw, Send, ShieldAlert, SlidersHorizontal, Undo2, User, Wallet, X, Zap, TriangleAlert, CircleHelp, Ban, Pencil,
  type LucideIcon,
} from "lucide-react-native";

const I = {
  home: House, chat: MessageCircle, activity: Activity, settings: SlidersHorizontal, plus: Plus, undo: Undo2, lock: Lock, x: X, check: Check,
  chevronRight: ChevronRight, chevronLeft: ChevronLeft, chevronDown: ChevronDown, copy: Copy, clock: Clock, send: Send, arrowUp: ArrowUp, arrowIn: ArrowDownLeft,
  user: User, key: KeyRound, globe: Globe, layers: Layers, wallet: Wallet, alert: TriangleAlert, refresh: RefreshCw, bell: Bell,
  more: MoreHorizontal, bolt: Zap, shield: ShieldAlert, help: CircleHelp, ban: Ban, edit: Pencil,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof I;

export function Icon({ name, size = 22, color = "#0F2236", stroke = 1.75 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const L = I[name];
  return <L size={size} color={color} strokeWidth={stroke} />;
}
