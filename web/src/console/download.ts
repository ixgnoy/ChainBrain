import { txUrl } from "../shared";

/** Saves text as a file through a Blob (no server involved). */
export function downloadText(name: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Explorer links (the FISCO server's own explorer) exist only for a real chain; the built-in network and a local fork have none. */
export const baseScanLink = (net: { builtin: boolean; dev: boolean }) => (net.builtin || net.dev ? undefined : txUrl);
