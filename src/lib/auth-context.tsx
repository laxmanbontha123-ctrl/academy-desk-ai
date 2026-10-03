"use client";

import {
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithCustomToken,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { auth } from "./firebase";

function phoneAuthError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;

  switch (code) {
    case "auth/invalid-phone-number":
      return "Enter a valid phone number with country code.";
    case "auth/invalid-verification-code":
      return "That verification code is incorrect.";
    case "auth/code-expired":
      return "That verification code has expired. Request a new one.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/quota-exceeded":
      return "SMS verification is temporarily unavailable. Please try again later.";
    case "auth/captcha-check-failed":
      return "Security verification failed. Please try again.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is not enabled yet.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return fallback;
  }
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
  sendPhoneOtp: (phoneNumber: string) => Promise<void>;
  verifyPhoneOtp: (code: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const phoneNumberRef = useRef("");
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  function clearPhoneVerification() {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    confirmationRef.current = null;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearPhoneVerification();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,

      async sendEmailOtp(email) {
        const response = await fetch("/api/auth/email-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "send",
            email: email.trim().toLowerCase(),
          }),
        });

        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to send verification code.");
        }
      },

      async verifyEmailOtp(email, code) {
        const response = await fetch("/api/auth/email-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "verify",
            email: email.trim().toLowerCase(),
            code: code.trim(),
          }),
        });

        const result = (await response.json()) as {
          token?: string;
          user?: {
            uid: string;
            email: string | null;
            name: string;
          };
          error?: string;
        };

        if (!response.ok || !result.token) {
          throw new Error(result.error ?? "Unable to verify the code.");
        }

        await signInWithCustomToken(auth, result.token);
      },

      async sendPhoneOtp(phoneNumber) {
        const normalizedPhone = phoneNumber.trim();

        if (!/^\+\d+$/.test(normalizedPhone)) {
          throw new Error("Enter a valid phone number with country code.");
        }

        if (phoneNumberRef.current !== normalizedPhone) {
          clearPhoneVerification();
          phoneNumberRef.current = normalizedPhone;
        } else {
          recaptchaRef.current?.clear();
          recaptchaRef.current = null;
          confirmationRef.current = null;
        }

        try {
          recaptchaRef.current = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            { size: "invisible" },
          );
          confirmationRef.current = await signInWithPhoneNumber(
            auth,
            normalizedPhone,
            recaptchaRef.current,
          );
        } catch (error) {
          clearPhoneVerification();
          throw new Error(
            phoneAuthError(error, "Unable to send the verification code."),
          );
        }
      },

      async verifyPhoneOtp(code, name) {
        const confirmation = confirmationRef.current;

        if (!confirmation) {
          throw new Error("Request a verification code first.");
        }

        try {
          const credential = await confirmation.confirm(code.trim());
          const token = await credential.user.getIdToken(true);
          const response = await fetch("/api/auth/bootstrap-profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name: name?.trim() || undefined }),
          });

          const result = (await response.json()) as { error?: string };

          if (!response.ok) {
            await signOut(auth);
            throw new Error(
              result.error ?? "Unable to complete profile setup right now.",
            );
          }

          confirmationRef.current = null;
        } catch (error) {
          if (!auth.currentUser) {
            clearPhoneVerification();
          }

          if (error instanceof Error && !("code" in error)) {
            throw error;
          }

          throw new Error(
            phoneAuthError(error, "Unable to verify the code."),
          );
        }
      },

      logout() {
        return signOut(auth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
