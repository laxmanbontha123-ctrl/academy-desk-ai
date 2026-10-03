import type { FirestoreDate } from "@/types/academy";

export function toDate(value: FirestoreDate): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "object" && "toDate" in value) return value.toDate();
  return null;
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatDate(value: FirestoreDate, fallback = "Not available") {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date)
    : fallback;
}

export function formatDateTime(value: FirestoreDate, fallback = "Not scheduled") {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date)
    : fallback;
}
