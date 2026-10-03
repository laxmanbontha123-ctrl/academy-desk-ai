import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ticketRequestSchema } from "@/lib/server/schemas";
import { triageMessage } from "@/lib/server/triage";

export const runtime = "nodejs";

function parseRequestBody(payload: unknown) {
  const parsed = ticketRequestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid complaint request.");
  }

  const message = parsed.data.message.trim();

  if (message.length < 10 || message.length > 2000) {
    throw new ApiError(400, "Complaint message must be 10 to 2000 characters.");
  }

  const courseId = parsed.data.courseId?.trim();

  return { message, courseId: courseId || undefined };
}

async function getCourseContext(uid: string, courseId: string | undefined) {
  if (!courseId) {
    return { courseId: null, courseTitle: null };
  }

  const enrollment = await adminDb
    .collection("enrollments")
    .where("uid", "==", uid)
    .where("courseId", "==", courseId)
    .limit(1)
    .get();

  if (enrollment.empty) {
    throw new ApiError(400, "The selected course is not enrolled by this user.");
  }

  const data = enrollment.docs[0].data();

  return {
    courseId,
    courseTitle: typeof data.courseTitle === "string" ? data.courseTitle : null,
  };
}

export async function POST(request: Request) {
  try {
    const authenticatedUser = await requireUser(request);
    const payload = await request.json().catch(() => null);
    const { message, courseId } = parseRequestBody(payload);
    const course = await getCourseContext(authenticatedUser.uid, courseId);
    const startedAt = Date.now();
    const triage = await triageMessage(message);
    const ticketId = adminDb.collection("tickets").doc().id;
    const ticketNumber = `ADT-${Date.now().toString(36).toUpperCase()}-${ticketId.slice(0, 6).toUpperCase()}`;
    const now = Timestamp.now();
    const escalated = triage.result.escalation;
    const escalationReason = escalated
      ? triage.result.priorityReason
      : null;

    const ticket = {
      uid: authenticatedUser.uid,
      studentName: authenticatedUser.profile.name,
      ticketNumber,
      courseId: course.courseId,
      courseTitle: course.courseTitle,
      originalMessage: message,
      category: triage.result.category,
      priority: triage.result.priority,
      priorityReason: triage.result.priorityReason,
      department: triage.result.department,
      sentiment: triage.result.sentiment,
      summary: triage.result.summary,
      aiSuggestedReply: triage.result.suggestedReply,
      aiConfidence: triage.result.confidence,
      language: triage.result.language,
      duplicateOfTicketId: null,
      triageSource: triage.triageSource,
      status: "Open",
      escalated,
      escalationReason,
      slaDueAt: null,
      adminResponse: null,
      aiDraftUsed: false,
      satisfaction: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      resolvedAt: null,
      timeline: [
        {
          type: "created",
          status: "Open",
          message: "Support request created.",
          actor: "system",
          createdAt: now,
        },
      ],
    };

    const batch = adminDb.batch();
    batch.set(adminDb.collection("tickets").doc(ticketId), ticket);
    batch.set(adminDb.collection("ticketInternal").doc(ticketId), {
      aiInternalNote: triage.result.internalNote,
      triageModel: triage.model,
      triageLatencyMs: Date.now() - startedAt,
      fallbackReason: triage.fallbackReason,
    });
    await batch.commit();

    return NextResponse.json(
      {
        ticketId,
        ticketNumber,
        status: "Open",
        category: triage.result.category,
        priority: triage.result.priority,
        priorityReason: triage.result.priorityReason,
        department: triage.result.department,
        sentiment: triage.result.sentiment,
        summary: triage.result.summary,
        suggestedReply: triage.result.suggestedReply,
        escalated,
        escalationReason,
        triageSource: triage.triageSource,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.safeMessage }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid complaint request." }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to create the support request." },
      { status: 500 },
    );
  }
}
