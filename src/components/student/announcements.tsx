"use client";

import { formatDate, toDate } from "@/lib/format";
import type { Announcement, Course } from "@/types/academy";
import { Badge, Card, EmptyState, SectionHeading, Skeleton } from "./ui";

export function Announcements({ announcements, courses, loading }: { announcements: Announcement[]; courses: Course[]; loading: boolean }) {
  if (loading) return <><SectionHeading title="Announcements" /><Skeleton className="h-64" /></>;
  return <div><SectionHeading title="Announcements" detail="Stay up to date with academy news." />{!announcements.length ? <EmptyState title="No announcements" /> : <div className="space-y-4">{[...announcements].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)).map((item) => <Card key={item.id}><div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{item.courseId ? courses.find((course) => course.id === item.courseId)?.title ?? "Course update" : "All students"}</Badge><span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span></div><h3 className="mt-3 text-xl font-black text-white">{item.title ?? "Announcement"}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{item.body ?? "No further details available."}</p></Card>)}</div>}</div>;
}
