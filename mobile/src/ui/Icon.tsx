// Lucide icons (design system: no emoji icons) behind the app's small icon vocabulary.
import React from "react";
import {
  Activity, Ban, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, Globe, House, KeyRound, Layers, Lock, MessageCircle, Moon,
  Play, Plus, RefreshCw, Send, Shield, ShieldAlert, ShieldCheck, ShieldOff, SlidersHorizontal, Sparkles, Tag, Trash2, TriangleAlert, Undo2, User, Wallet, X, Zap, ArrowDown, ArrowUp,
  type LucideIcon,
} from "lucide-react-native";

const I = {
  home: House, chat: MessageCircle, activity: Activity, settings: SlidersHorizontal, plus: Plus, undo: Undo2,
  shield: Shield, shieldCheck: ShieldCheck, shieldAlert: ShieldAlert, shieldOff: ShieldOff, lock: Lock, ban: Ban,
  x: X, check: Check, chevronRight: ChevronRight, chevronLeft: ChevronLeft, chevronDown: ChevronDown, copy: Copy, external: ExternalLink,
  bolt: Zap, clock: Clock, send: Send, arrowUp: ArrowUp, arrowDown: ArrowDown, user: User, sparkle: Sparkles, key: KeyRound, globe: Globe,
  layers: Layers, play: Play, wallet: Wallet, moon: Moon, alert: TriangleAlert, refresh: RefreshCw, trash: Trash2, tag: Tag,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof I;

export function Icon({ name, size = 22, color = "#16181A", stroke = 1.75 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const L = I[name];
  return <L size={size} color={color} strokeWidth={stroke} />;
}
