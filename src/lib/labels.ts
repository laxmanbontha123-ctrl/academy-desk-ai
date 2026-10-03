const labelMap: Record<string, string> = {
  open: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  not_eligible: "Not eligible",
  eligible: "Eligible",
  issued: "Issued",
};

export function statusLabel(value: string | null | undefined) {
  return labelMap[value ?? ""] ?? value ?? "Unknown";
}

export function statusTone(value: string | null | undefined) {
  if (["paid", "resolved", "closed", "issued", "eligible"].includes(value ?? "")) return "green";
  if (["pending", "waiting", "assigned", "in_progress"].includes(value ?? "")) return "blue";
  if (["overdue", "critical"].includes(value ?? "")) return "red";
  return "slate";
}
