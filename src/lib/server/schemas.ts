import { z } from "zod";

export const triageSchema = z.object({
  category: z.enum([
    "Payment & Billing",
    "Technical Access",
    "Course Content",
    "Class Schedule",
    "Attendance",
    "Certificate",
    "Internship/Placement",
    "Instructor/Conduct",
    "Enrollment",
    "General",
  ]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  priorityReason: z.string().trim().min(1),
  department: z.enum([
    "Finance",
    "Technical Support",
    "Academics",
    "Admissions",
    "Placement & Careers",
    "Student Affairs",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative", "urgent"]),
  summary: z.string().trim().min(1),
  suggestedReply: z.string().trim().min(1),
  internalNote: z.string().trim().min(1),
  escalation: z.boolean(),
  confidence: z.number().min(0).max(1),
  language: z.string().trim().min(1),
  possibleDuplicate: z.boolean(),
});

export type TriageResult = z.infer<typeof triageSchema>;

export const ticketRequestSchema = z
  .object({
    message: z.string(),
    courseId: z.string().optional(),
  })
  .strict();

export type TicketRequest = z.infer<typeof ticketRequestSchema>;
