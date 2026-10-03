import { createHash, randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    email: z.string().trim().toLowerCase().email(),
  }),
  z.object({
    action: z.literal("verify"),
    email: z.string().trim().toLowerCase().email(),
    code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
  }),
]);

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

class ResendError extends Error {
  constructor(
    public readonly status: number,
    public readonly providerMessage: string,
  ) {
    super("Email delivery failed.");
  }
}

function challengeId(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

async function sendEmailOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your AcademyDesk AI verification code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#18181b">
          <h2 style="margin:0 0 12px">AcademyDesk AI</h2>
          <p style="color:#52525b">Use this verification code to sign in.</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:20px 0">${code}</div>
          <p style="color:#71717a">This code expires in 10 minutes.</p>
          <p style="font-size:13px;color:#a1a1aa">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    let providerMessage = "Email provider rejected the request.";

    try {
      const details = (await response.json()) as { message?: unknown };

      if (typeof details.message === "string" && details.message.length > 0) {
        providerMessage = details.message.slice(0, 200);
      }
    } catch {
      // Keep the sanitized fallback message.
    }

    throw new ResendError(response.status, providerMessage);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid OTP request." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const ref = adminDb
      .collection("emailOtpChallenges")
      .doc(challengeId(data.email));

    if (data.action === "send") {
      const existing = await ref.get();
      const existingData = existing.exists ? existing.data() : null;

      if (existingData?.createdAt instanceof Timestamp) {
        const elapsed = Date.now() - existingData.createdAt.toMillis();

        if (elapsed < SEND_COOLDOWN_MS) {
          return NextResponse.json(
            { error: "Please wait before requesting another OTP." },
            { status: 429 },
          );
        }
      }

      const code = randomInt(100000, 1000000).toString();
      const requestId = randomUUID();

      await ref.set({
        email: data.email,
        requestId,
        codeHash: hashCode(code),
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + OTP_EXPIRY_MS),
        attempts: 0,
      });

      try {
        await sendEmailOtp(data.email, code);
      } catch (error) {
        const current = await ref.get();

        if (current.data()?.requestId === requestId) {
          await ref.delete();
        }

        if (error instanceof ResendError) {
          console.error("[email-otp] resend failure", {
            status: error.status,
            message: error.providerMessage,
          });
        } else {
          console.error("[email-otp] resend failure", {
            status: undefined,
            message: undefined,
          });
        }

        return NextResponse.json(
          { error: "We could not send the verification email. Please try again." },
          { status: 502 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Verification code sent.",
      });
    }

    const verification = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        return { outcome: "missing" as const };
      }

      const challenge = snapshot.data();

      if (!challenge) {
        return { outcome: "invalid" as const };
      }

      if (
        !(challenge.expiresAt instanceof Timestamp) ||
        challenge.expiresAt.toMillis() < Date.now()
      ) {
        transaction.delete(ref);
        return { outcome: "expired" as const };
      }

      const attempts =
        typeof challenge.attempts === "number" ? challenge.attempts : 0;

      if (attempts >= MAX_ATTEMPTS) {
        transaction.delete(ref);
        return { outcome: "too_many_attempts" as const };
      }

      if (challenge.codeHash !== hashCode(data.code)) {
        transaction.update(ref, { attempts: attempts + 1 });
        return { outcome: "incorrect" as const };
      }

      transaction.delete(ref);

      return { outcome: "verified" as const };
    });

    if (verification.outcome === "missing") {
      return NextResponse.json(
        { error: "No active verification code. Please request a new OTP." },
        { status: 400 },
      );
    }

    if (verification.outcome === "invalid") {
      return NextResponse.json(
        { error: "Verification failed. Please request a new OTP." },
        { status: 400 },
      );
    }

    if (verification.outcome === "expired") {
      return NextResponse.json(
        { error: "This OTP has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (verification.outcome === "too_many_attempts") {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new OTP." },
        { status: 429 },
      );
    }

    if (verification.outcome === "incorrect") {
      return NextResponse.json(
        { error: "Incorrect OTP." },
        { status: 400 },
      );
    }

    let firebaseUser;

    try {
      firebaseUser = await adminAuth.getUserByEmail(data.email);
      await adminAuth.updateUser(firebaseUser.uid, {
        emailVerified: true,
      });
    } catch (error) {
      const authError = error as { code?: string };

      if (authError.code !== "auth/user-not-found") {
        throw error;
      }

      firebaseUser = await adminAuth.createUser({
        email: data.email,
        emailVerified: true,
      });
    }

    const userRef = adminDb.collection("users").doc(firebaseUser.uid);
    const userSnapshot = await userRef.get();
    let profileName = firebaseUser.displayName ?? data.email.split("@")[0];

    if (!userSnapshot.exists) {
      await userRef.set({
        name: profileName,
        email: data.email,
        role: "student",
        status: "active",
        createdAt: Timestamp.now(),
      });
    } else {
      const profile = userSnapshot.data() ?? {};

      if (typeof profile.name === "string") {
        profileName = profile.name;
      }
    }

    const token = await adminAuth.createCustomToken(firebaseUser.uid);

    return NextResponse.json({
      success: true,
      token,
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: profileName,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process email verification right now." },
      { status: 500 },
    );
  }
}
