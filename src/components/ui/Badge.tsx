import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-canvas text-slate",
  blue: "bg-blue-tint text-blue",
  purple: "bg-purple-tint text-purple",
  ok: "bg-ok-tint text-ok",
  warn: "bg-warn-tint text-warn",
  danger: "bg-danger-tint text-danger",
  ink: "bg-ink text-white",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-small font-semibold ${TONES[tone]}`}>{children}</span>;
}
