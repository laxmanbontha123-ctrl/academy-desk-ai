import { createFallbackTriage } from "./fallback-triage";
import { requestAiTriage } from "./ai";
import type { TriageResult } from "./schemas";

const priorityRank = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
} as const;

function departmentForCategory(category: TriageResult["category"]) {
  switch (category) {
    case "Payment & Billing":
      return "Finance";
    case "Technical Access":
      return "Technical Support";
    case "Course Content":
    case "Class Schedule":
    case "Attendance":
      return "Academics";
    case "Enrollment":
      return "Admissions";
    case "Internship/Placement":
      return "Placement & Careers";
    default:
      return "Student Affairs";
  }
}

function containsAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function enforceSafety(
  message: string,
  candidate: TriageResult,
): TriageResult {
  const safetyKeywords = [
    "harass",
    "abuse",
    "assault",
    "unsafe",
    "threat",
    "violence",
    "sexual misconduct",
  ];
  const paymentDeadlineKeywords = [
    "paid",
    "payment",
    "deducted",
    "money left",
    "money was taken",
  ];
  const deadlineKeywords = ["exam", "deadline", "tomorrow", "due today"];
  const safetyEscalation = containsAny(message, safetyKeywords);
  const paymentDeadlineEscalation =
    containsAny(message, paymentDeadlineKeywords) &&
    containsAny(message, deadlineKeywords);
  const forcedPriority = safetyEscalation
    ? "critical"
    : paymentDeadlineEscalation
      ? "high"
      : candidate.priority;
  const priority =
    priorityRank[forcedPriority] > priorityRank[candidate.priority]
      ? forcedPriority
      : candidate.priority;
  const suggestedReply = containsAny(candidate.suggestedReply, [
    "refund",
    "reimburse",
    "money back",
  ])
    ? "Your request has been received and will be reviewed."
    : candidate.suggestedReply;

  return {
    ...candidate,
    department: candidate.department || departmentForCategory(candidate.category),
    priority,
    priorityReason:
      priority === candidate.priority
        ? candidate.priorityReason
        : safetyEscalation
          ? "Safety or harassment concern requires critical handling."
          : "Payment concern combined with an exam or deadline requires urgent handling.",
    escalation: candidate.escalation || priority === "critical" || safetyEscalation || paymentDeadlineEscalation,
    suggestedReply,
  };
}

export async function triageMessage(message: string) {
  const aiResult = await requestAiTriage(message);

  if (!aiResult.result) {
    return {
      result: createFallbackTriage(message),
      triageSource: "fallback" as const,
      fallbackReason: aiResult.fallbackReason ?? "unknown",
      model: process.env.AI_MODEL || "gpt-6-luna",
    };
  }

  return {
    result: enforceSafety(message, aiResult.result),
    triageSource: "ai" as const,
    fallbackReason: null,
    model: process.env.AI_MODEL || "gpt-6-luna",
  };
}
