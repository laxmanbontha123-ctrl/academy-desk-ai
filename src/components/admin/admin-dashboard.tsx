"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  LogOut,
  Menu,
  Search,
  Ticket as TicketIcon,
  type LucideIcon,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/labels";
import type { Ticket } from "@/types/academy";
import { Badge, Card, EmptyState, SectionHeading, Skeleton } from "@/components/student/ui";

type AdminUser = {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  getIdToken: () => Promise<string>;
};

const filters = ["all", "open", "assigned", "in_progress", "waiting", "resolved", "closed"] as const;

function normalizeTicket(ticket: Ticket): Ticket {
  const status = ticket.status?.toLowerCase();
  return { ...ticket, status: status === "new" ? "open" : status };
}

export function AdminDashboard({ user, onLogout }: { user: AdminUser; onLogout: () => Promise<void> }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as { tickets?: Ticket[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load tickets.");
      setTickets((result.tickets ?? []).map(normalizeTicket));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // The loader owns its request lifecycle state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTickets();
  }, [loadTickets]);

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesFilter = filter === "all" || ticket.status === filter;
      const haystack = `${ticket.ticketNumber ?? ""} ${ticket.studentName ?? ""} ${ticket.category ?? ""} ${ticket.originalMessage ?? ""}`.toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [filter, search, tickets]);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const pending = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status ?? "")).length;
  const resolved = tickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status ?? "")).length;
  const highPriority = tickets.filter((ticket) => ["high", "critical"].includes(ticket.priority ?? "") && !["resolved", "closed"].includes(ticket.status ?? "")).length;

  const updateTicket = async (status: Ticket["status"], response: string, escalate: boolean) => {
    if (!selected) return;
    setUpdating(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const result = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticketId: selected.id, status, adminResponse: response, escalated: escalate }),
      });
      const payload = (await result.json()) as { error?: string };
      if (!result.ok) throw new Error(payload.error ?? "Unable to update ticket.");
      await loadTickets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update ticket.");
    } finally {
      setUpdating(false);
    }
  };

  const nav = [["queue", "Ticket queue", TicketIcon], ["insights", "Overview", BarChart3]] as const;
  const stats: [LucideIcon, string, number][] = [[TicketIcon, "Total tickets", tickets.length], [Clock3, "Needs attention", pending], [AlertTriangle, "High priority", highPriority], [CheckCircle2, "Resolved", resolved]];
  return <main className="min-h-screen bg-slate-950 text-slate-100"><div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_30%)]"><header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><button className="rounded-xl p-2 text-slate-300 lg:hidden" onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-950"><span className="font-black">A</span></div><div><h1 className="font-bold tracking-tight">AcademyDesk AI</h1><p className="text-xs text-slate-400">Academy operations</p></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-white">Academy Admin</p><p className="text-xs text-blue-300">Administrator</p></div><button onClick={() => onLogout().catch(() => undefined)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"><LogOut size={16} /><span className="hidden sm:inline">Logout</span></button></div></div></header><div className="mx-auto flex max-w-[1500px]"><aside className={`${mobileOpen ? "block" : "hidden"} fixed inset-x-4 top-20 z-20 rounded-2xl border border-white/10 bg-slate-900 p-3 lg:sticky lg:top-[81px] lg:block lg:h-[calc(100vh-81px)] lg:w-64 lg:shrink-0 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent lg:px-4 lg:py-8`}><nav className="space-y-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => { setMobileOpen(false); if (id === "queue") setSelectedId(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/5"><Icon size={17} />{label}</button>)}</nav></aside><section className="min-w-0 flex-1 px-5 py-8 pb-12 sm:px-8 lg:px-10"><SectionHeading title="Admin dashboard" detail="Monitor and resolve student support requests." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([Icon, label, value]) => <Card key={label}><Icon className="text-blue-300" size={20} /><p className="mt-4 text-sm text-slate-400">{label}</p><p className="mt-1 text-3xl font-black text-white">{value}</p></Card>)}</div><Card className="mt-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-xl px-3 py-2 text-xs font-bold ${filter === item ? "bg-blue-400/20 text-blue-300" : "bg-white/5 text-slate-400"}`}>{statusLabel(item)}</button>)}</div><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-500" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets or students" className="w-full rounded-xl border border-white/10 bg-slate-950 px-9 py-2 text-sm text-white outline-none placeholder:text-slate-500 lg:w-72" /></div></div></Card>{error && <div className="mt-4 rounded-2xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}{loading ? <div className="mt-6 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} />)}</div> : <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]"><Card className="overflow-hidden p-0">{visibleTickets.length ? <div className="divide-y divide-white/10">{visibleTickets.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/[0.05] ${selectedId === ticket.id ? "bg-blue-400/10" : ""}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-white">{ticket.ticketNumber ?? ticket.id}</p><Badge tone={statusTone(ticket.priority)}>{ticket.priority ?? "medium"}</Badge>{ticket.escalated && <Badge tone="red">Escalated</Badge>}</div><p className="mt-1 truncate text-sm text-slate-300">{ticket.studentName ?? "Student"} · {ticket.category ?? "General"}</p><p className="mt-1 truncate text-xs text-slate-500">{ticket.summary ?? ticket.originalMessage ?? "No summary"}</p></div><div className="flex shrink-0 items-center gap-2"><Badge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</Badge><ChevronRight size={16} className="text-slate-500" /></div></button>)}</div> : <div className="p-5"><EmptyState title="No tickets match these filters" /></div>}</Card>{selected ? <AdminTicketDetail key={selected.id} ticket={selected} updating={updating} onUpdate={updateTicket} /> : <Card className="hidden h-fit xl:block"><Filter className="text-slate-500" /><p className="mt-4 font-bold text-white">Select a ticket</p><p className="mt-1 text-sm text-slate-400">Review the student message and update its status.</p></Card>}</div>}</section></div></div></main>;
}

function AdminTicketDetail({ ticket, updating, onUpdate }: { ticket: Ticket; updating: boolean; onUpdate: (status: Ticket["status"], response: string, escalate: boolean) => Promise<void> }) {
  const [status, setStatus] = useState<Ticket["status"]>(ticket.status ?? "open");
  const [response, setResponse] = useState(ticket.adminResponse ?? "");
  const [escalated, setEscalated] = useState(Boolean(ticket.escalated));
  return <Card className="h-fit"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Ticket detail</p><h3 className="mt-2 text-xl font-black text-white">{ticket.ticketNumber ?? ticket.id}</h3><p className="mt-1 text-sm text-slate-400">{ticket.studentName ?? "Student"} · {ticket.department ?? "Student Affairs"}</p></div>{ticket.escalated && <Badge tone="red">Escalated</Badge>}</div><div className="mt-5 rounded-2xl bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Student message</p><p className="mt-2 text-sm leading-6 text-slate-200">{ticket.originalMessage ?? ticket.summary ?? "No message available."}</p></div><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-500">Category</p><p className="mt-1 text-sm font-bold text-white">{ticket.category ?? "General"}</p></div><div><p className="text-xs text-slate-500">Priority</p><Badge tone={statusTone(ticket.priority)}>{ticket.priority ?? "medium"}</Badge></div><div><p className="text-xs text-slate-500">Created</p><p className="mt-1 text-sm text-slate-300">{formatDateTime(ticket.createdAt)}</p></div><div><p className="text-xs text-slate-500">SLA</p><p className="mt-1 text-sm text-slate-300">{formatDateTime(ticket.slaDueAt)}</p></div></div><label className="mt-5 block"><span className="mb-2 block text-sm font-bold text-slate-200">Status</span><select value={status} onChange={(event) => setStatus(event.target.value as Ticket["status"])} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="open">New</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="waiting">Waiting</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label><label className="mt-4 block"><span className="mb-2 block text-sm font-bold text-slate-200">Admin response</span><textarea value={response} onChange={(event) => setResponse(event.target.value)} maxLength={2000} placeholder="Write a response for the student..." className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500" /></label><label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-300"><input type="checkbox" checked={escalated} onChange={(event) => setEscalated(event.target.checked)} /> Escalate this ticket</label><button disabled={updating} onClick={() => onUpdate(status, response, escalated)} className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{updating ? "Saving..." : "Save ticket update"}</button><div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Timeline</p>{(ticket.timeline ?? []).slice(-5).reverse().map((entry, index) => <div key={`${entry.createdAt}-${index}`} className="mt-3 text-sm"><p className="font-bold text-white">{entry.message ?? "Ticket update"}</p><p className="text-xs text-slate-500">{entry.actor ?? "system"} · {formatDateTime(entry.createdAt)}</p></div>)}</div></Card>;
}
