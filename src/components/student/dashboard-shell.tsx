"use client";

import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { where } from "firebase/firestore";
import { useCollection, useProfile } from "@/hooks/use-firestore";
import { toDate } from "@/lib/format";
import { statusLabel } from "@/lib/labels";
import type { Announcement, ClassSession, Course, Enrollment, Internship, Payment, Ticket } from "@/types/academy";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { Announcements } from "./announcements";
import { Certificates } from "./certificates";
import { Courses } from "./courses";
import { Internships } from "./internships";
import { Overview } from "./overview";
import { Payments } from "./payments";
import { Profile } from "./profile";
import { Schedule } from "./schedule";
import { Support } from "./support";

const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["courses", "My Courses", BookOpen],
  ["schedule", "Schedule", CalendarDays],
  ["payments", "Payments", CreditCard],
  ["certificates", "Certificates", GraduationCap],
  ["internships", "Internships", BriefcaseBusiness],
  ["announcements", "Announcements", Bell],
  ["profile", "Profile", UserRound],
  ["support", "Support", LifeBuoy],
] as const;

export function StudentDashboard({ user, onLogout, loginRole }: { user: { uid: string; email: string | null; phoneNumber: string | null; getIdToken: () => Promise<string> }; onLogout: () => Promise<void>; loginRole: "student" | "admin" }) {
  const [section, setSection] = useState("overview");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useProfile(user.uid);
  const enrollmentConstraints = useMemo(() => [where("uid", "==", user.uid)], [user.uid]);
  const paymentConstraints = useMemo(() => [where("uid", "==", user.uid)], [user.uid]);
  const ticketConstraints = useMemo(() => [where("uid", "==", user.uid)], [user.uid]);
  const courses = useCollection<Course>("courses");
  const classes = useCollection<ClassSession>("classes");
  const allAnnouncements = useCollection<Announcement>("announcements");
  const internships = useCollection<Internship>("internships");
  const enrollments = useCollection<Enrollment>("enrollments", enrollmentConstraints);
  const payments = useCollection<Payment>("payments", paymentConstraints);
  const tickets = useCollection<Ticket>("tickets", ticketConstraints);
  const enrolledIds = useMemo(() => new Set(enrollments.data.map((item) => item.courseId)), [enrollments.data]);
  const visibleClasses = useMemo(() => classes.data.filter((item) => enrolledIds.has(item.courseId)), [classes.data, enrolledIds]);
  const visibleAnnouncements = useMemo(() => allAnnouncements.data.filter((item) => !item.courseId || enrolledIds.has(item.courseId)), [allAnnouncements.data, enrolledIds]);
  const visibleInternships = useMemo(() => internships.data.filter((item) => !item.eligibleCourseIds?.length || item.eligibleCourseIds.some((id) => enrolledIds.has(id))), [internships.data, enrolledIds]);
  const dataLoading = courses.loading || classes.loading || enrollments.loading || payments.loading || tickets.loading || allAnnouncements.loading || internships.loading;
  const nextClass = visibleClasses.filter((item) => (toDate(item.startsAt)?.getTime() ?? 0) >= new Date().getTime()).sort((a, b) => (toDate(a.startsAt)?.getTime() ?? 0) - (toDate(b.startsAt)?.getTime() ?? 0))[0] ?? null;
  const navigate = useCallback((next: string) => { setSection(next); setMobileOpen(false); }, []);
  const report = useCallback((message: string) => { setSupportMessage(message); navigate("support"); }, [navigate]);
  const profileName = profile.data?.name ?? user.email?.split("@")[0] ?? user.phoneNumber ?? "Student";
  if (profile.loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Loading your verified profile...</main>;
  }
  if (profile.data && profile.data.role !== loginRole) {
    const verifiedRole = profile.data.role === "admin" ? "Admin" : "Student";
    return <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-8 text-center shadow-2xl backdrop-blur-2xl"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">!</div><h1 className="mt-5 text-2xl font-black text-white">Wrong login option</h1><p className="mt-3 text-sm leading-6 text-slate-300">This account is registered as an {verifiedRole}. Please use the matching login option.</p><button onClick={() => onLogout().catch(() => undefined)} className="mt-6 w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950">Log out</button></section></main>;
  }
  if (profile.data?.role === "admin") {
    return <AdminDashboard user={user} onLogout={onLogout} />;
  }
  const sectionContent = section === "overview" ? <Overview enrollments={enrollments.data} payments={payments.data} tickets={tickets.data} announcements={visibleAnnouncements} nextClass={nextClass} loading={dataLoading} onNavigate={navigate} />
    : section === "courses" ? <Courses courses={courses.data} enrollments={enrollments.data} payments={payments.data} loading={courses.loading || enrollments.loading || payments.loading} selectedId={courseId} onSelect={setCourseId} />
    : section === "schedule" ? <Schedule classes={visibleClasses} courses={courses.data} loading={classes.loading || courses.loading || enrollments.loading} onReport={report} />
    : section === "payments" ? <Payments payments={payments.data} loading={payments.loading} onReport={report} />
    : section === "certificates" ? <Certificates enrollments={enrollments.data} courses={courses.data} profile={profile.data} loading={enrollments.loading || courses.loading} />
    : section === "internships" ? <Internships internships={visibleInternships} enrollments={enrollments.data} loading={internships.loading || enrollments.loading} />
    : section === "announcements" ? <Announcements announcements={visibleAnnouncements} courses={courses.data} loading={allAnnouncements.loading || courses.loading} />
    : section === "profile" ? <Profile profile={profile.data} loading={profile.loading} fallbackEmail={user.email} fallbackPhone={user.phoneNumber} />
    : <Support user={user} enrollments={enrollments.data} courses={courses.data} initialMessage={supportMessage} onConsumed={() => setSupportMessage("")} />;

  return <main className="min-h-screen bg-slate-950 text-slate-100"><div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_30%)]"><header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><button className="rounded-xl p-2 text-slate-300 lg:hidden" onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-950"><span className="font-black">A</span></div><div><h1 className="font-bold tracking-tight">AcademyDesk AI</h1><p className="hidden text-xs text-slate-400 sm:block">Student Support & Helpdesk</p></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-white">{profileName}</p><p className="text-xs text-slate-400">{statusLabel(profile.data?.role ?? "student")}</p></div><button onClick={() => onLogout().catch(() => undefined)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"><LogOut size={16} /><span className="hidden sm:inline">Logout</span></button></div></div></header><div className="mx-auto flex max-w-[1500px]"><aside className={`${mobileOpen ? "block" : "hidden"} fixed inset-x-4 top-20 z-20 rounded-2xl border border-white/10 bg-slate-900 p-3 lg:sticky lg:top-[81px] lg:block lg:h-[calc(100vh-81px)] lg:w-64 lg:shrink-0 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent lg:px-4 lg:py-8`}><nav className="space-y-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => navigate(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${section === id ? "bg-blue-400/15 text-blue-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={17} />{label}</button>)}</nav></aside><section className="min-w-0 flex-1 px-5 py-8 pb-28 sm:px-8 lg:px-10">{sectionContent}</section></div><nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-white/10 bg-slate-950/90 p-2 backdrop-blur-xl lg:hidden">{nav.slice(0, 4).map(([id, label, Icon]) => <button key={id} onClick={() => navigate(id)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold ${section === id ? "text-blue-300" : "text-slate-500"}`}><Icon size={17} />{label}</button>)}</nav></div></main>;
}
