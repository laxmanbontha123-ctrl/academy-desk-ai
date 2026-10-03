"use client";

import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "./firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
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
