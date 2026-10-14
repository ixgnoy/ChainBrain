// The agent asked a question. The owner's next chat message is the answer (the server resolves the pending question on /api/chat).
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { Input } from "./ui/input";
import { router } from "expo-router";
import { useTheme } from "../theme";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/primitives";
import { T } from "../ui/Text";
import { Orb } from "../ui/Orb";
import { cleanText } from "../lib/sanitize";
import { radius } from "../tokens";
import type { Approval } from "../lib/events";

export function QuestionSheet() {
  const { pending, questionOpen, setQuestionOpen } = useApp();
  const q = pending.find((a) => a.kind === "question");
  const last = useRef<Approval | undefined>(q);
  if (q) last.current = q;
  const shown = q ?? last.current;
  return (
    <Sheet visible={questionOpen && !!q} onClose={() => setQuestionOpen(false)}>
      {shown ? <Body q={shown} /> : null}
    </Sheet>
  );
}

function Body({ q }: { q: Approval }) {
  const { c } = useTheme();
  const { sendChat, setQuestionOpen } = useApp();
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    setQuestionOpen(false);
    void sendChat(text, q.pocket);
    router.navigate("/agent");
  };
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Orb size={40} state="waiting" />
        <View style={{ flex: 1 }}>
          <T v="headingMd">Your agent asks</T>
          <T v="caption" color="text2">Your answer goes straight back to the agent.</T>
        </View>
      </View>
      <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.bgElev1, padding: 14 }}>
        <T v="body">{cleanText(q.text, 600)}</T>
      </View>
      <Input value={text} onChangeText={setText} placeholder="Your answer" onSubmitEditing={send} returnKeyType="send" accessibilityLabel="Answer" />
      <Button label="Send answer" onPress={send} disabled={!text.trim()} />
    </View>
  );
}
