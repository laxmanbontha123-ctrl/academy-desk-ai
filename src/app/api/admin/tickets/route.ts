import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireAdmin } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

const updateSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["open", "assigned", "in_progress", "waiting", "resolved", "closed"]),
  adminResponse: z.string().trim().max(2000).optional(),
  escalated: z.boolean().optional(),
});

function serializeTimestamp(value: unknown) {
  return value && typeof value === "object" && "toMillis" in value
    ? (value as { toMillis: () => number }).toMillis()
    : null;
}

function serializeTicket(snapshot: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    resolvedAt: serializeTimestamp(data.resolvedAt),
    slaDueAt: serializeTimestamp(data.slaDueAt),
    timeline: Array.isArray(data.timeline)
      ? data.timeline.map((entry) => ({
          ...entry,
          createdAt: serializeTimestamp(entry.createdAt),
        }))
      : [],
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection("tickets").get();

    return NextResponse.json({
      tickets: snapshot.docs
        .map(serializeTicket)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.safeMessage }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unable to load the admin ticket queue." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid ticket update." }, { status: 400 });
    }

    const { ticketId, status, adminResponse, escalated } = parsed.data;
    const ticketRef = adminDb.collection("tickets").doc(ticketId);
    const ticketSnapshot = await ticketRef.get();

    if (!ticketSnapshot.exists) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const current = ticketSnapshot.data() ?? {};
    const timeline = Array.isArray(current.timeline) ? current.timeline : [];
    const update: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
      timeline: [
        ...timeline,
        {
          type: "status_updated",
          status,
          message: adminResponse?.trim() || `Ticket moved to ${status}.`,
          actor: admin.profile.name || "Academy Admin",
          createdAt: new Date(),
        },
      ],
    };

    if (adminResponse !== undefined) update.adminResponse = adminResponse.trim() || null;
    if (escalated !== undefined) {
      update.escalated = escalated;
      update.escalationReason = escalated
        ? current.escalationReason ?? "Escalated by administrator."
        : null;
    }
    if (status === "resolved" || status === "closed") {
      update.resolvedAt = FieldValue.serverTimestamp();
    } else if (current.status === "resolved" || current.status === "closed") {
      update.resolvedAt = null;
    }

    await ticketRef.update(update);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.safeMessage }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unable to update the ticket." },
      { status: 500 },
    );
  }
}
