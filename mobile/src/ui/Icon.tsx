// Lucide icons (1.75 stroke) behind the app's small icon vocabulary.
import React from "react";
import {
  Activity, ArrowDownLeft, ArrowUp, Bell, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock, Copy, Globe, House, KeyRound, Layers, Lock, MessageCircle,
  MoreHorizontal, Plus, RefreshCw, Send, ShieldAlert, SlidersHorizontal, Undo2, User, Wallet, X, Zap, TriangleAlert, CircleHelp, Ban, Pencil, ArrowDown, SquarePlus, Square, Info,
  Radar, Brain, Snowflake, Eye, Sparkles, Target, Gauge, ListChecks,
  Bot, Link, QrCode, Unlink, Landmark, Hourglass, FileText, Search, Receipt, Download, ArrowUpRight, Inbox, ShieldCheck, CircleCheck, Mic, CreditCard, Power, ChartColumn, Asterisk, ScanFace, Fingerprint,
  type LucideIcon,
} from "lucide-react-native";

const I = {
  home: House, chat: MessageCircle, activity: Activity, settings: SlidersHorizontal, plus: Plus, undo: Undo2, lock: Lock, x: X, check: Check,
  chevronRight: ChevronRight, chevronLeft: ChevronLeft, chevronDown: ChevronDown, chevronUp: ChevronUp, copy: Copy, clock: Clock, send: Send, arrowUp: ArrowUp, arrowIn: ArrowDownLeft,
  user: User, key: KeyRound, globe: Globe, layers: Layers, wallet: Wallet, alert: TriangleAlert, refresh: RefreshCw, bell: Bell,
  more: MoreHorizontal, bolt: Zap, shield: ShieldAlert, help: CircleHelp, ban: Ban, edit: Pencil, arrowDown: ArrowDown, squarePlus: SquarePlus, stop: Square, info: Info,
  radar: Radar, brain: Brain, freeze: Snowflake, eye: Eye, sparkles: Sparkles, target: Target, gauge: Gauge, checks: ListChecks,
  bot: Bot, link: Link, qr: QrCode, unlink: Unlink, vault: Landmark, hourglass: Hourglass, file: FileText, search: Search, receipt: Receipt, download: Download,
  arrowUpRight: ArrowUpRight, inbox: Inbox, shieldCheck: ShieldCheck, circleCheck: CircleCheck, mic: Mic, card: CreditCard, power: Power, chart: ChartColumn, asterisk: Asterisk, faceId: ScanFace, fingerprint: Fingerprint,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof I;

export function Icon({ name, size = 22, color = "#111215", stroke = 1.75 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const L = I[name];
  return <L size={size} color={color} strokeWidth={stroke} />;
}
