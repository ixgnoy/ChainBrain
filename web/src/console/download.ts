/** Saves text as a file through a Blob (no server involved). */
export function downloadText(name: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** BaseScan links exist only for a public chain; the built-in network and a local fork have none. */
export const baseScanLink = (net: { builtin: boolean; dev: boolean }) => (net.builtin || net.dev ? undefined : (h: string) => `https://sepolia.basescan.org/tx/${h}`);
