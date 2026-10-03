"use client";

import { ExternalLink } from "lucide-react";
import { formatDate, toDate } from "@/lib/format";
import type { Enrollment, Internship } from "@/types/academy";
import { Badge, Card, EmptyState, SectionHeading, Skeleton } from "./ui";

export function Internships({ internships, enrollments, loading }: { internships: Internship[]; enrollments: Enrollment[]; loading: boolean }) {
  if (loading) return <><SectionHeading title="Internships" /><Skeleton className="h-64" /></>;
  const ids = new Set(enrollments.map((item) => item.courseId));
  const ordered = [...internships].sort((a, b) => Number(b.eligibleCourseIds?.some((id) => ids.has(id)) ?? false) - Number(a.eligibleCourseIds?.some((id) => ids.has(id)) ?? false));
  return <div><SectionHeading title="Internships" detail="Explore opportunities matched to your enrolled courses." />{!ordered.length ? <EmptyState title="No internships listed" /> : <div className="grid gap-4 md:grid-cols-2">{ordered.map((item) => { const eligible = item.eligibleCourseIds?.some((id) => ids.has(id)); return <Card key={item.id}><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-white">{item.title ?? "Opportunity"}</h3><p className="mt-1 text-sm text-slate-400">{item.company ?? "Company"} · {item.location ?? "Location"}</p></div>{eligible && <Badge tone="green">Eligible</Badge>}</div><div className="mt-4 flex flex-wrap gap-2">{(item.skills ?? []).map((skill) => <Badge key={skill}>{skill}</Badge>)}</div><p className="mt-4 text-sm text-slate-400">Apply by {formatDate(item.deadline)}</p>{item.applyUrl && toDate(item.deadline)?.getTime() !== undefined && <a href={item.applyUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-300">Apply <ExternalLink size={15} /></a>}</Card>})}</div>}</div>;
}
