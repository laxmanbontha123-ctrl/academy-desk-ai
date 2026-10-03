import type { Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | Date | number | null | undefined;

export type Course = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  instructor?: string;
  durationWeeks?: number;
  fee?: number;
  schedule?: string;
  modules?: string[];
  resources?: { title?: string; url?: string; type?: "pdf" | "video" | "link" }[];
  isActive?: boolean;
};

export type ClassSession = {
  id: string;
  courseId?: string;
  title?: string;
  startsAt?: FirestoreDate;
  mode?: string;
  location?: string;
  joinLink?: string;
  recordingUrl?: string;
};

export type Enrollment = {
  id: string;
  uid?: string;
  courseId?: string;
  courseTitle?: string;
  status?: string;
  enrolledAt?: FirestoreDate;
  progressPercent?: number;
  attendedClasses?: number;
  totalClasses?: number;
  certificateStatus?: "not_eligible" | "eligible" | "issued" | string;
};

export type Payment = {
  id: string;
  uid?: string;
  enrollmentId?: string;
  courseTitle?: string;
  amount?: number;
  status?: "paid" | "pending" | "overdue" | string;
  dueDate?: FirestoreDate;
  paidAt?: FirestoreDate;
  receiptNo?: string | null;
};

export type Announcement = {
  id: string;
  title?: string;
  body?: string;
  courseId?: string | null;
  createdAt?: FirestoreDate;
};

export type Internship = {
  id: string;
  title?: string;
  company?: string;
  location?: string;
  skills?: string[];
  eligibleCourseIds?: string[];
  deadline?: FirestoreDate;
  applyUrl?: string;
};

export type TicketTimelineEntry = {
  type?: string;
  status?: string;
  message?: string;
  actor?: string;
  createdAt?: FirestoreDate;
};

export type Ticket = {
  id: string;
  uid?: string;
  studentName?: string;
  ticketNumber?: string;
  courseId?: string | null;
  courseTitle?: string | null;
  originalMessage?: string;
  category?: string;
  priority?: string;
  priorityReason?: string;
  department?: string;
  sentiment?: string;
  summary?: string;
  aiSuggestedReply?: string;
  aiConfidence?: number;
  language?: string;
  duplicateOfTicketId?: string | null;
  triageSource?: string;
  status?: "open" | "assigned" | "in_progress" | "waiting" | "resolved" | "closed" | string;
  escalated?: boolean;
  escalationReason?: string | null;
  slaDueAt?: FirestoreDate;
  adminResponse?: string | null;
  aiDraftUsed?: boolean;
  satisfaction?: number | null;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
  resolvedAt?: FirestoreDate;
  timeline?: TicketTimelineEntry[];
};

export type UserProfile = {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  status?: string;
  createdAt?: FirestoreDate;
};
