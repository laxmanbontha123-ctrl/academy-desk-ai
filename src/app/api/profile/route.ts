import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
});

export async function PATCH(request: Request) {
  try {
    const authenticatedUser = await requireUser(request);
    const body = await request.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid name and email." },
        { status: 400 },
      );
    }

    const profileRef = adminDb.collection("users").doc(authenticatedUser.uid);
    const snapshot = await profileRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404 },
      );
    }

    const existing = snapshot.data();

    await profileRef.update({
      name: parsed.data.name,
      email: parsed.data.email,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      profile: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: existing?.role ?? "student",
        status: existing?.status ?? "active",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.safeMessage },
        { status: error.status },
      );
    }

    const safeError = error as { name?: string; code?: string };
    console.error("[profile-update]", {
      name: safeError.name ?? "Error",
      code: safeError.code ?? "unknown",
    });

    return NextResponse.json(
      { error: "Unable to update your profile." },
      { status: 500 },
    );
  }
}
