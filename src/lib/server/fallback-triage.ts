import type { TriageResult } from "./schemas";

export function createFallbackTriage(message: string): TriageResult {
  return {
    category: "General",
    priority: "medium",
    priorityReason: "Manual review required",
    department: "Student Affairs",
    sentiment: "neutral",
    summary: message.slice(0, 500),
    suggestedReply: "Your request has been received and will be reviewed.",
    internalNote: "AI triage unavailable; manual review required.",
    escalation: false,
    confidence: 0,
    language: "en",
    possibleDuplicate: false,
  };
}
