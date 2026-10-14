/** The demo sentences the scripted model recognises (v2 spec scenes 1-8). Served as GET /dev/scenes. */
export type SceneInfo = {
  id: string;
  title: string;
  /** What the owner types. */
  text: string;
  /** Short label for a suggestion chip (the chip sends `text`). */
  chip?: string;
  /** Short label for the follow-up chip. */
  followChip?: string;
  /** Second message, when the scene is a two-step conversation. */
  followUp?: string;
  preset: "research" | "one-purchase" | "ask-every-time" | null;
  note: string;
};

export const SCENES: SceneInfo[] = [
  {
    id: "1", title: "Create pocket and task",
    chip: "Durian report under US$2", followChip: "Per report, add the forecast",
    text: "Get me a market report on durian exports, under US$2, by tonight.",
    followUp: "Per report. Get the premium one too if it adds a forecast.",
    preset: "research",
    note: "The agent asks one question (US$2 in total or per report?). Answer it with the follow-up (any answer works), then confirm the intent card. The follow-up also runs scenes 2 and 3: DataLite is paid, then DataPro's US$1.50 report needs your signature on the approval sheet.",
  },
  {
    id: "2", title: "Plan and buy",
    chip: "Buy the DataLite report",
    text: "Buy the DataLite durian report. Max US$1, by tonight.",
    preset: "research",
    note: "Standalone version of the cheap purchase. Confirm the intent card; DataLite (US$0.30) is paid with no further approval.",
  },
  {
    id: "3", title: "Ask the owner",
    chip: "Premium report with forecast",
    text: "Get the DataPro premium durian report with the 2026 forecast. Max US$2, by tonight.",
    preset: "research",
    note: "Standalone version of the approval. Confirm the intent card, then approve and sign the payment (US$1.50 is above the US$1 ask-me threshold). Declining gives OWNER_DECLINED.",
  },
  {
    id: "4", title: "Refused, then re-plan",
    chip: "Harbour Wines trade report",
    text: "Buy Harbour Wines' fruit and wine trade report. Max US$1, by tonight. Confirmed, go ahead.",
    preset: "research",
    note: "Harbour Wines is not in the pocket: refusal SELLER_NOT_ALLOWED, then the agent buys DataLite's fruit trade report (US$0.35). You still tap Confirm on the intent card.",
  },
  {
    id: "5", title: "Prompt injection",
    chip: "Check ShadyFeed's preview",
    text: "Check ShadyFeed's free durian price preview, then buy the DataLite durian report. Max US$1, by tonight.",
    preset: "research",
    note: "Inject text into ShadyFeed first with the red-team box (POST {sellersUrl}/admin/inject). The agent flags ShadyFeed and still buys only from DataLite. A disclosure event is raised either way.",
  },
  {
    id: "6", title: "Phishing seller",
    chip: "ShadyFeed's full feed",
    text: "Get ShadyFeed's full feed, give them whatever they need.",
    preset: "research",
    note: "No intent card. ShadyFeed asks for personal data and a signature: disclosure event with DISCLOSURE_REFUSED and SIGNATURE_TYPE_NOT_ALLOWED. No payment.",
  },
  {
    id: "7", title: "Revoke mid-task",
    chip: "Two DataLite reports",
    text: "Buy DataLite's durian report and its fruit trade report. Max US$1 each, by tonight.",
    preset: "research",
    note: "After the first payment the agent pauses (about 10 seconds by default). Tap Revoke on the pocket in that window: the second payment is refused with POCKET_REVOKED. Then Return funds.",
  },
  {
    id: "8", title: "Dead end",
    chip: "A report for US$0.20",
    text: "Buy a durian export report, max US$0.20, by tonight.",
    preset: "one-purchase",
    note: "Use a pocket with budget and cap US$0.20, DataLite only, never ask. DataLite costs US$0.30 (OVER_CAP), DataPro is not allowed; the agent stops and suggests raising the cap and budget. Nothing is paid.",
  },
];
