import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (process.env.DEMO_MODE !== "true") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const phoneNumber = process.env.DEMO_STUDENT_PHONE;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Demo student is not configured." },
        { status: 500 },
      );
    }

    const firebaseUser = await adminAuth.getUserByPhoneNumber(phoneNumber);
    const profileRef = adminDb.collection("users").doc(firebaseUser.uid);
    const profileSnapshot = await profileRef.get();

    if (!profileSnapshot.exists) {
      return NextResponse.json(
        { error: "Demo student profile is not configured." },
        { status: 500 },
      );
    }

    const profile = profileSnapshot.data();

    if (profile?.role !== "student" || profile?.status !== "active") {
      return NextResponse.json(
        { error: "Demo student account is unavailable." },
        { status: 403 },
      );
    }

    const token = await adminAuth.createCustomToken(firebaseUser.uid, {
      role: "student",
      status: "active",
    });

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    const safeError = error as { code?: string; name?: string };
    console.error("[demo-student]", {
      name: safeError.name ?? "Error",
      code: safeError.code ?? "unknown",
    });

    return NextResponse.json(
      { error: "Unable to start demo student login." },
      { status: 500 },
    );
  }
}
