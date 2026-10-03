import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, verifyBearerToken } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

const requestSchema = z.object({
  name: z.string().trim().max(80).optional(),
});

function sanitizedErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  return {
    name:
      "name" in error && typeof error.name === "string"
        ? error.name
        : undefined,
    code:
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const decodedToken = await verifyBearerToken(request);
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid profile details." },
        { status: 400 },
      );
    }

    const requestedName = parsed.data.name || undefined;
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const fallbackName = decodedToken.phone_number
      ? `Student ${decodedToken.phone_number.replace(/\D/g, "").slice(-4)}`
      : "Student";

    const profile = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);

      if (snapshot.exists) {
        const data = snapshot.data() ?? {};

        return {
          name: typeof data.name === "string" ? data.name : "",
          role: typeof data.role === "string" ? data.role : "",
          status: typeof data.status === "string" ? data.status : "",
        };
      }

      const newProfile = {
        name: requestedName ?? fallbackName,
        phone: decodedToken.phone_number ?? null,
        email: decodedToken.email ?? null,
        role: "student",
        status: "active",
        createdAt: Timestamp.now(),
      };

      transaction.create(userRef, newProfile);

      return {
        name: newProfile.name,
        role: newProfile.role,
        status: newProfile.status,
      };
    });

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.safeMessage },
        { status: error.status },
      );
    }

    console.error("[bootstrap-profile] failure", sanitizedErrorDetails(error));
    return NextResponse.json(
      { error: "Unable to complete profile setup right now." },
      { status: 500 },
    );
  }
}
