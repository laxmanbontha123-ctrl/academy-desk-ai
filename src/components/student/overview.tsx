"use client";

import { ArrowRight, CalendarDays, CreditCard, LifeBuoy, BookOpen, type LucideIcon } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/labels";
import type { Announcement, ClassSession, Enrollment, Payment, Ticket } from "@/types/academy";
import { Badge, Card, EmptyState, SectionHeading, Skeleton } from "./ui";

type Props = { enrollments: Enrollment[]; payments: Payment[]; tickets: Ticket[]; announcements: Announcement[]; nextClass: ClassSession | null; loading: boolean; onNavigate: (section: string) => void };

export function Overview({ enrollments, payments, tickets, announcements, nextClass, loading, onNavigate }: Props) {
  if (loading) return <><SectionHeading title="Overview" detail="Your learning and support at a glance." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} />)}</div></>;
  const active = enrollments.filter((item) => item.status === "active").length;
  const average = enrollments.length ? Math.round(enrollments.reduce((sum, item) => sum + (item.progressPercent ?? 0), 0) / enrollments.length) : 0;
  const pending = payments.filter((item) => item.status === "pending" || item.status === "overdue");
  const open = tickets.filter((item) => !["resolved", "closed"].includes(item.status ?? "")).length;
  const stats: [LucideIcon, string, string | number, string][] = [[BookOpen, "Active courses", active, "blue"], [ArrowRight, "Average progress", `${average}%`, "green"], [CreditCard, "Pending payments", formatCurrency(pending.reduce((sum, item) => sum + (item.amount ?? 0), 0)), "red"], [LifeBuoy, "Open tickets", open, "blue"]];
  return <div>
    <SectionHeading title="Overview" detail="Your learning and support at a glance." />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(([Icon, label, value, tone]) => <Card key={label}><div className={`mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-${tone === "red" ? "red" : tone === "green" ? "emerald" : "blue"}-400/15 text-${tone === "red" ? "red" : tone === "green" ? "emerald" : "blue"}-300`}><Icon size={20} /></div><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></Card>)}
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Next class</p><h3 className="mt-2 text-xl font-black text-white">{nextClass?.title ?? "No upcoming classes"}</h3></div><CalendarDays className="text-blue-300" /></div>{nextClass ? <p className="mt-4 text-sm text-slate-300">{formatDateTime(nextClass.startsAt)} · {nextClass.mode ?? "Class"}{nextClass.location ? ` · ${nextClass.location}` : ""}</p> : <p className="mt-4 text-sm text-slate-400">Your upcoming schedule will appear here.</p>}</Card>
      <Card><div className="flex items-center justify-between"><h3 className="font-black text-white">Latest announcements</h3><button onClick={() => onNavigate("announcements")} className="text-xs font-bold text-blue-300">View all</button></div>{announcements.length ? announcements.slice(0, 2).map((item) => <div key={item.id} className="mt-4 border-t border-white/10 pt-3"><p className="font-bold text-white">{item.title ?? "Announcement"}</p><p className="mt-1 line-clamp-2 text-sm text-slate-400">{item.body ?? "Read the latest academy update."}</p></div>) : <div className="mt-4"><EmptyState title="No announcements" /></div>}</Card>
    </div>
    <Card className="mt-6"><div className="flex items-center justify-between"><h3 className="font-black text-white">Recent support requests</h3><button onClick={() => onNavigate("support")} className="text-xs font-bold text-blue-300">Raise a request</button></div>{tickets.length ? <div className="mt-4 space-y-3">{tickets.slice(0, 2).map((ticket) => <div key={ticket.id} className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-3"><div><p className="font-bold text-white">{ticket.ticketNumber ?? "Support request"}</p><p className="text-xs text-slate-400">{ticket.category ?? "General"}</p></div><Badge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</Badge></div>)}</div> : <div className="mt-4"><EmptyState title="No support requests" /></div>}</Card>
  </div>;
}
