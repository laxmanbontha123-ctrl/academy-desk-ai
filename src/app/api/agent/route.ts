import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, requireUser, verifyBearerToken } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { triageMessage } from "@/lib/server/triage";

export const runtime = "nodejs";

const requestSchema = z.object({
  message: z.string().trim().min(3).max(2000),
});

const tools = [
  {
    type: "function",
    name: "get_student_profile",
    description:
      "Get the authenticated student's verified AcademyDesk profile.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_enrolled_courses",
    description:
      "Get the authenticated student's enrolled courses, progress, attendance and certificate status.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_payments",
    description:
      "Get payment records for the authenticated student. Use this for payment questions.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_upcoming_classes",
    description:
      "Get upcoming classes for the authenticated student's enrolled courses.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_my_tickets",
    description:
      "Get recent support tickets belonging only to the authenticated student.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_support_ticket",
    description:
      "Create a real support ticket when the student's issue needs human/admin action or cannot be solved from available academy data.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          minLength: 10,
          maxLength: 2000,
        },
        courseId: {
          type: ["string", "null"],
        },
      },
      required: ["message", "courseId"],
      additionalProperties: false,
    },
  },
];

const instructions = `You are AcademyDesk AI, an action-oriented student support agent.

You are NOT a generic chatbot.

Your job is to understand the student's request, use verified AcademyDesk data, answer routine questions, and create a real support ticket when human action is needed.

Rules:
- Only access data belonging to the authenticated student.
- Never invent academy facts.
- Use tools before answering questions about the student's profile, courses, payments, classes or tickets.
- Solve routine information requests directly when the verified data is sufficient.
- Create a support ticket when an issue needs human/admin action or cannot be solved from the available data.
- Never expose internal AI notes or privileged admin data.
- Never modify grades, attendance, payments, certificates, roles or other privileged records.
- Never promise refunds or guaranteed outcomes.
- For safety, harassment, abuse or similar urgent concerns, create a ticket and explain that it has been escalated for human review.
- Reply in the student's language when reasonably clear.
- Be concise, practical and friendly.
`;

function json(value: unknown) {
  return JSON.stringify(value);
}

async function callOpenAI(input: unknown, previousResponseId?: string, useTools = true) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const body: Record<string, unknown> = {
      model: process.env.AI_MODEL || "gpt-6-luna",
      instructions,
      input,
      tools: useTools ? tools : [],
    };

    if (previousResponseId) {
      body.previous_response_id = previousResponseId;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `OpenAI request failed (${response.status}): ${details.slice(0, 240)}`,
      );
    }

    return (await response.json()) as {
      id: string;
      output?: Array<Record<string, unknown>>;
      output_text?: string;
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getProfile(uid: string) {
  const snapshot = await adminDb.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};

  return {
    name: typeof data.name === "string" ? data.name : "Student",
    email: typeof data.email === "string" ? data.email : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    role: typeof data.role === "string" ? data.role : "student",
    status: typeof data.status === "string" ? data.status : "active",
  };
}

async function getCourses(uid: string) {
  const snapshot = await adminDb
    .collection("enrollments")
    .where("uid", "==", uid)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      courseId: data.courseId ?? null,
      courseTitle: data.courseTitle ?? null,
      status: data.status ?? null,
      progressPercent: data.progressPercent ?? null,
      attendedClasses: data.attendedClasses ?? null,
      totalClasses: data.totalClasses ?? null,
      certificateStatus: data.certificateStatus ?? null,
    };
  });
}

async function getPayments(uid: string) {
  const snapshot = await adminDb
    .collection("payments")
    .where("uid", "==", uid)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      courseTitle: data.courseTitle ?? null,
      amount: data.amount ?? null,
      status: data.status ?? null,
      dueDate:
        data.dueDate instanceof Timestamp
          ? data.dueDate.toDate().toISOString()
          : null,
      paidAt:
        data.paidAt instanceof Timestamp
          ? data.paidAt.toDate().toISOString()
          : null,
      receiptNo: data.receiptNo ?? null,
    };
  });
}

async function getClasses(uid: string) {
  const enrollments = await adminDb
    .collection("enrollments")
    .where("uid", "==", uid)
    .get();

  const courseIds = new Set(
    enrollments.docs
      .map((doc) => doc.data().courseId)
      .filter((value): value is string => typeof value === "string"),
  );

  const snapshot = await adminDb.collection("classes").get();

  const classes = snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;

    return {
      id: doc.id,
      courseId: typeof data.courseId === "string" ? data.courseId : null,
      title: typeof data.title === "string" ? data.title : null,
      startsAt:
        data.startsAt instanceof Timestamp
          ? data.startsAt.toDate().toISOString()
          : null,
      mode: typeof data.mode === "string" ? data.mode : null,
      location: typeof data.location === "string" ? data.location : null,
      joinLink: typeof data.joinLink === "string" ? data.joinLink : null,
    };
  });

  return classes
    .filter((item) => item.courseId && courseIds.has(item.courseId))
    .filter(
      (item) =>
        item.startsAt &&
        new Date(item.startsAt).getTime() >= Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt ?? 0).getTime() -
        new Date(b.startsAt ?? 0).getTime(),
    )
    .slice(0, 10);
}
async function getTickets(uid: string) {
  const snapshot = await adminDb
    .collection("tickets")
    .where("uid", "==", uid)
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ticketNumber: data.ticketNumber ?? null,
        status: data.status ?? null,
        category: data.category ?? null,
        priority: data.priority ?? null,
        summary: data.summary ?? data.originalMessage ?? null,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    )
    .slice(0, 10);
}

async function createTicket(
  uid: string,
  message: string,
  courseId: string | null,
) {
  const profile = await getProfile(uid);

  if (!profile) {
    throw new ApiError(404, "Student profile not found.");
  }

  let courseTitle: string | null = null;

  if (courseId) {
    const enrollment = await adminDb
      .collection("enrollments")
      .where("uid", "==", uid)
      .where("courseId", "==", courseId)
      .limit(1)
      .get();

    if (enrollment.empty) {
      throw new ApiError(
        400,
        "The selected course is not enrolled by this user.",
      );
    }

    const data = enrollment.docs[0].data();
    courseTitle =
      typeof data.courseTitle === "string" ? data.courseTitle : null;
  }

  const triage = await triageMessage(message);
  const ticketRef = adminDb.collection("tickets").doc();
  const ticketInternalRef = adminDb
    .collection("ticketInternal")
    .doc(ticketRef.id);

  const ticketNumber = `ADT-${Date.now().toString(36).toUpperCase()}-${ticketRef.id
    .slice(0, 6)
    .toUpperCase()}`;

  const now = Timestamp.now();
  const escalated = triage.result.escalation;

  ticketRef.set({
    uid,
    studentName: profile.name,
    ticketNumber,
    courseId,
    courseTitle,
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
    escalationReason: escalated ? triage.result.priorityReason : null,
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
        message: "Support request created by AcademyDesk AI Agent.",
        actor: "ai-agent",
        createdAt: now,
      },
    ],
  });

  ticketInternalRef.set({
    aiInternalNote: triage.result.internalNote,
    triageModel: triage.model,
    triageLatencyMs: null,
    fallbackReason: triage.fallbackReason,
    createdBy: "ai-agent",
  });

  await Promise.all([ticketRef.update({}), ticketInternalRef.update({})]);

  return {
    ticketNumber,
    status: "Open",
    category: triage.result.category,
    priority: triage.result.priority,
    department: triage.result.department,
    escalated,
    summary: triage.result.summary,
  };
}

async function executeTool(
  uid: string,
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    case "get_student_profile":
      return getProfile(uid);
    case "get_enrolled_courses":
      return getCourses(uid);
    case "get_payments":
      return getPayments(uid);
    case "get_upcoming_classes":
      return getClasses(uid);
    case "get_my_tickets":
      return getTickets(uid);
    case "create_support_ticket":
      return createTicket(
        uid,
        typeof args.message === "string" ? args.message : "",
        typeof args.courseId === "string" ? args.courseId : null,
      );
    default:
      throw new Error("Unknown tool.");
  }
}


function getDemoAgentContext() {
  return `DEMO ACADEMY DATA FOR BONTHA LAXMAN:

Student:
- Name: Bontha Laxman
- Email: laxman.bontha123@gmail.com
- Phone: +919000000001
- Role: student
- Status: active
- Member since: 3 Oct 2026

Enrolled courses:
1. Full Stack Web Development — active — 62% progress — 14/20 classes attended — certificate not eligible — payment paid — schedule Tue/Thu 7:00 PM
2. AI & ML Fundamentals — active — 30% progress — 6/20 classes attended — certificate not eligible — payment paid — schedule Sat/Sun 10:00 AM
3. UI/UX Design — completed — 100% progress — 20/20 classes attended — certificate issued — payment paid — schedule Wed/Sat 5:00 PM
4. Data Analytics — active — 15% progress — 3/20 classes attended — certificate not eligible — payment pending — schedule Mon/Wed 6:00 PM

Payments:
- Full Stack Web Development — ₹42,000 — paid
- AI & ML Fundamentals — ₹46,000 — paid
- UI/UX Design — ₹30,000 — paid
- Data Analytics — ₹28,000 — pending

Recent support tickets:
- ADT-DEMO-RESOLVED — Payment & Billing — medium — resolved — payment confirmation request
- ADT-DEMO-ACCESS — Technical Access — high — in progress — class portal access issue
- ADT-DEMO-SCHEDULE — Class Schedule — low — open — next class schedule request

Schedule reference for today, 3 Oct 2026:
- Saturday: AI/ML at 10:00 AM, UI/UX at 5:00 PM
- Sunday: AI/ML at 10:00 AM
- Monday: Data Analytics at 6:00 PM
- Tuesday: Full Stack at 7:00 PM
- Wednesday: Data Analytics at 6:00 PM and UI/UX at 5:00 PM
- Thursday: Full Stack at 7:00 PM

Use ONLY this verified demo data for this request. Do not invent records, amounts, statuses, links, or ticket actions.`;
}
export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please describe your request." },
        { status: 400 },
      );
    }

    if (process.env.DEMO_MODE === "true") {
      await verifyBearerToken(request);

      const demoResponse = await callOpenAI(
        [
          {
            role: "user",
            content: `${getDemoAgentContext()}

Student question:
${parsed.data.message}`,
          },
        ],
        undefined,
        false,
      );

      return NextResponse.json({
        answer:
          demoResponse.output_text?.trim() ||
          "I could not complete that request. Please try again.",
      });
    }

    const authenticatedUser = await requireUser(request);

    let response = await callOpenAI([
      {
        role: "user",
        content: parsed.data.message,
      },
    ]);

    for (let round = 0; round < 6; round += 1) {
      const functionCalls = (response.output ?? []).filter(
        (item) =>
          item.type === "function_call" &&
          typeof item.name === "string" &&
          typeof item.call_id === "string",
      );

      if (functionCalls.length === 0) {
        return NextResponse.json({
          answer:
            response.output_text?.trim() ||
            "I could not complete that request. Please try again.",
        });
      }

      const toolOutputs = [];

      for (const call of functionCalls) {
        const name = call.name as string;
        const callId = call.call_id as string;

        let args: Record<string, unknown> = {};

        try {
          args =
            typeof call.arguments === "string"
              ? (JSON.parse(call.arguments) as Record<string, unknown>)
              : {};
        } catch {
          toolOutputs.push({
            type: "function_call_output",
            call_id: callId,
            output: json({ error: "Invalid tool arguments." }),
          });
          continue;
        }

        try {
          const result = await executeTool(
            authenticatedUser.uid,
            name,
            args,
          );

          toolOutputs.push({
            type: "function_call_output",
            call_id: callId,
            output: json(result),
          });
        } catch (error) {
          toolOutputs.push({
            type: "function_call_output",
            call_id: callId,
            output: json({
              error:
                error instanceof ApiError
                  ? error.safeMessage
                  : "Tool execution failed.",
            }),
          });
        }
      }

      response = await callOpenAI(toolOutputs, response.id);
    }

    return NextResponse.json(
      {
        answer:
          "I could not complete that request right now. Please try again.",
      },
      { status: 504 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.safeMessage },
        { status: error.status },
      );
    }

    console.error(
      "[agent]",
      error instanceof Error ? error.name : "Error",
    );

    return NextResponse.json(
      { error: "The AI support agent is temporarily unavailable." },
      { status: 500 },
    );
  }
}



