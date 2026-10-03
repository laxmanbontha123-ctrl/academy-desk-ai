"use client";

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10 backdrop-blur-xl ${className}`}>{children}</section>;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: string }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-400/15 text-emerald-300",
    blue: "bg-blue-400/15 text-blue-300",
    red: "bg-red-400/15 text-red-300",
    slate: "bg-white/10 text-slate-300",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${colors[tone] ?? colors.slate}`}>{children}</span>;
}

export function ProgressBar({ value = 0 }: { value?: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function EmptyState({ title, detail = "Nothing to show yet." }: { title: string; detail?: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center"><p className="font-bold text-white">{title}</p><p className="mt-1 text-sm text-slate-400">{detail}</p></div>;
}

export function Skeleton({ className = "h-24" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/10 ${className}`} />;
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return <div className="mb-6"><h2 className="text-2xl font-black text-white sm:text-3xl">{title}</h2>{detail && <p className="mt-1 text-sm text-slate-400">{detail}</p>}</div>;
}
