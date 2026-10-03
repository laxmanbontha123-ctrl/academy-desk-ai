"use client";

import { ExternalLink } from "lucide-react";
import { formatDateTime, toDate } from "@/lib/format";
import type { ClassSession, Course } from "@/types/academy";
import { Badge, Card, EmptyState, SectionHeading, Skeleton } from "./ui";

export function Schedule({ classes, courses, loading, onReport }: { classes: ClassSession[]; courses: Course[]; loading: boolean; onReport: (message: string) => void }) {
  if (loading) return <><SectionHeading title="Schedule" /><Skeleton className="h-64" /></>;
  const now = new Date().getTime();
  const upcoming = classes.filter((item) => (toDate(item.startsAt)?.getTime() ?? 0) >= now).sort((a, b) => (toDate(a.startsAt)?.getTime() ?? 0) - (toDate(b.startsAt)?.getTime() ?? 0));
  const past = classes.filter((item) => (toDate(item.startsAt)?.getTime() ?? 0) < now).sort((a, b) => (toDate(b.startsAt)?.getTime() ?? 0) - (toDate(a.startsAt)?.getTime() ?? 0));
  const courseName = (id?: string) => courses.find((course) => course.id === id)?.title ?? "Course";
  return <div><SectionHeading title="Schedule" detail="Upcoming classes and recordings from your enrolled courses." /><Card><h3 className="font-black text-white">Upcoming classes</h3>{upcoming.length ? <div className="mt-4 space-y-3">{upcoming.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div><Badge tone="blue">{courseName(item.courseId)}</Badge><p className="mt-2 font-bold text-white">{item.title ?? "Class session"}</p><p className="text-sm text-slate-400">{formatDateTime(item.startsAt)} · {item.mode ?? "Class"}{item.location ? ` · ${item.location}` : ""}</p></div>{item.joinLink && <a href={item.joinLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-blue-300">Join class <ExternalLink size={15} /></a>}</div>)}</div> : <div className="mt-4"><EmptyState title="No upcoming classes" /></div>}</Card><Card className="mt-6"><h3 className="font-black text-white">Past classes</h3>{past.length ? <div className="mt-4 space-y-3">{past.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div><Badge>{courseName(item.courseId)}</Badge><p className="mt-2 font-bold text-white">{item.title ?? "Past class"}</p><p className="text-sm text-slate-400">{formatDateTime(item.startsAt)}</p></div><div className="flex flex-wrap items-center gap-3">{item.recordingUrl && <a href={item.recordingUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-300">Recording</a>}<button onClick={() => onReport(`I cannot open the recording for ${item.title ?? "my class"}.`)} className="text-xs font-bold text-slate-400 hover:text-white">Report issue</button></div></div>)}</div> : <div className="mt-4"><EmptyState title="No past classes" /></div>}</Card></div>;
}
