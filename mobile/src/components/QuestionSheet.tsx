// The agent asked a question. The owner's next chat message is the answer (the server resolves the pending question on /api/chat).
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { Sheet } from "../ui/Sheet";
import { SheetScroll } from "../ui/SheetScroll";
import { Button, Field } from "../ui/kit";
import { T } from "../ui/Text";
import { cleanText } from "../lib/sanitize";
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
  const { sendChat, setQuestionOpen } = useApp();
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    setQuestionOpen(false);
    void sendChat(text, q.pocket);
    router.navigate("/agent");
  };
  return (
    <SheetScroll keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <T v="section">Your agent has a question</T>
        <T v="body" color="ink2">{cleanText(q.text, 600)}</T>
      </View>
      <Field value={text} onChangeText={setText} placeholder="Your answer" onSubmitEditing={send} returnKeyType="send" accessibilityLabel="Answer" />
      <Button label="Send answer" onPress={send} disabled={!text.trim()} />
    </SheetScroll>
  );
}
