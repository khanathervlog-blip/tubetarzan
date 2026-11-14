export interface CaptionWord { word: string; start: number; end: number }
export interface CaptionLine { start: number; end: number; text: string }

/** Groups word timestamps into readable subtitle lines (max ~42 characters, ~4 s, or a pause > 0.8 s). */
export function groupIntoLines(words: CaptionWord[], maxChars = 42, maxSeconds = 4): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let cur: CaptionLine | null = null;
  for (const w of words) {
    const text = w.word.trim();
    if (!text) continue;
    if (cur && (w.start - cur.end > 0.8 || cur.text.length + 1 + text.length > maxChars || w.end - cur.start > maxSeconds)) {
      lines.push(cur);
      cur = null;
    }
    if (!cur) cur = { start: w.start, end: w.end, text };
    else {
      cur.text += " " + text;
      cur.end = w.end;
    }
    if (/[.!?؟۔]$/.test(text)) {
      lines.push(cur);
      cur = null;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
function stamp(sec: number, comma: boolean): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000), s = Math.floor((ms % 60_000) / 1000), r = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}${comma ? "," : "."}${pad(r, 3)}`;
}

export function toSrt(lines: CaptionLine[]): string {
  return lines.map((l, i) => `${i + 1}\n${stamp(l.start, true)} --> ${stamp(l.end, true)}\n${l.text}\n`).join("\n");
}
export function toVtt(lines: CaptionLine[]): string {
  return "WEBVTT\n\n" + lines.map((l) => `${stamp(l.start, false)} --> ${stamp(l.end, false)}\n${l.text}\n`).join("\n");
}
export function toTxt(lines: CaptionLine[]): string {
  return lines.map((l) => l.text).join("\n");
}
