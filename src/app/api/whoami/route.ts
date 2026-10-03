import { NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { uid, profile } = await requireUser(request);

    return NextResponse.json({
      uid,
      name: profile.name,
      role: profile.role,
      status: profile.status,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.safeMessage },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Unable to authenticate the request." },
      { status: 500 },
    );
  }
}
