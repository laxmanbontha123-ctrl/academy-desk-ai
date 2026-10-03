"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/labels";
import type { Payment } from "@/types/academy";
import { Badge, Card, EmptyState, SectionHeading, Skeleton } from "./ui";

export function Payments({ payments, loading, onReport }: { payments: Payment[]; loading: boolean; onReport: (message: string) => void }) {
  if (loading) return <><SectionHeading title="Payments" /><Skeleton className="h-72" /></>;
  const total = (status: string) => payments.filter((item) => item.status === status).reduce((sum, item) => sum + (item.amount ?? 0), 0);
  return <div><SectionHeading title="Payments" detail="Your payment records are read-only." /><div className="grid gap-4 sm:grid-cols-3">{[["Paid", "paid"], ["Pending", "pending"], ["Overdue", "overdue"]].map(([label, status]) => <Card key={status}><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-white">{formatCurrency(total(status))}</p></Card>)}</div><Card className="mt-6 overflow-x-auto">{payments.length ? <table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Course</th><th className="pb-3">Amount</th><th className="pb-3">Due</th><th className="pb-3">Status</th><th className="pb-3">Paid</th><th className="pb-3">Receipt</th><th /></tr></thead><tbody>{payments.map((item) => <tr key={item.id} className="border-t border-white/10 text-slate-300"><td className="py-4 font-bold text-white">{item.courseTitle ?? "Course"}</td><td>{formatCurrency(item.amount)}</td><td>{formatDate(item.dueDate)}</td><td><Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge></td><td>{formatDate(item.paidAt, "—")}</td><td>{item.receiptNo ?? "—"}</td><td>{(item.status === "pending" || item.status === "overdue") && <button onClick={() => onReport(`I paid for ${item.courseTitle ?? "my course"} but my payment is still showing as ${item.status}.`)} className="font-bold text-blue-300">Report issue</button>}</td></tr>)}</tbody></table> : <EmptyState title="No payment records" />}</Card></div>;
}
