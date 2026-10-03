import { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "./firebase-admin";

type UserProfile = {
  name: string;
  role: string;
  status: string;
};

export type AuthenticatedUser = {
  uid: string;
  profile: UserProfile;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = "ApiError";
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw new ApiError(401, "Authentication is required.");
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    throw new ApiError(401, "Authentication is required.");
  }

  return match[1];
}

function isDecodedIdToken(value: DecodedIdToken): value is DecodedIdToken {
  return typeof value.uid === "string" && value.uid.length > 0;
}

function isFirebaseAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
  );
}

function logServerFailure(prefix: string, error: unknown) {
  const details =
    typeof error === "object" && error !== null
      ? {
          name:
            "name" in error && typeof error.name === "string"
              ? error.name
              : undefined,
          code:
            "code" in error && typeof error.code === "string"
              ? error.code
              : undefined,
        }
      : {};

  console.error(prefix, details);
}

export async function requireUser(
  request: Request,
): Promise<AuthenticatedUser> {
  let decodedToken: DecodedIdToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(getBearerToken(request));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isFirebaseAuthError(error)) {
      throw new ApiError(401, "Authentication is required.");
    }

    logServerFailure("[auth] server verification failure", error);
    throw new ApiError(500, "Server authentication is temporarily unavailable.");
  }

  if (!isDecodedIdToken(decodedToken)) {
    throw new ApiError(
      500,
      "Server authentication is temporarily unavailable.",
    );
  }

  try {
    const profileSnapshot = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!profileSnapshot.exists) {
      throw new ApiError(403, "Your user profile is not available.");
    }

    const profile = profileSnapshot.data() as Partial<UserProfile> | undefined;

    if (!profile || profile.status !== "active") {
      throw new ApiError(403, "Your account is inactive.");
    }

    return {
      uid: decodedToken.uid,
      profile: {
        name: typeof profile.name === "string" ? profile.name : "",
        role: typeof profile.role === "string" ? profile.role : "",
        status: profile.status,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logServerFailure("[auth] profile load failure", error);
    throw new ApiError(500, "Server authentication is temporarily unavailable.");
  }
}

export async function requireAdmin(
  request: Request,
): Promise<AuthenticatedUser> {
  const authenticatedUser = await requireUser(request);

  if (authenticatedUser.profile.role !== "admin") {
    throw new ApiError(403, "Administrator access is required.");
  }

  return authenticatedUser;
}
