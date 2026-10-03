"use client";

import { FirebaseError } from "firebase/app";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account already exists for this email.";
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-disabled":
      return "The email or password is invalid.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export default function Home() {
  const { user, loading, login, register, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-md space-y-4 rounded-lg border p-6">
          <h1 className="text-2xl font-semibold">AcademyDesk AI</h1>
          <p>Signed in as {user.email}</p>
          <button
            className="rounded-md bg-black px-4 py-2 text-white"
            onClick={() => logout().catch((logoutError) => {
              setError(getAuthErrorMessage(logoutError));
            })}
            type="button"
          >
            Log out
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md space-y-4 rounded-lg border p-6">
        <div>
          <h1 className="text-2xl font-semibold">AcademyDesk AI</h1>
          <p className="text-sm text-zinc-600">
            {mode === "login" ? "Sign in to continue." : "Create a student account."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Name</span>
              <input
                className="w-full rounded-md border px-3 py-2"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Password</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              minLength={6}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Register"}
          </button>
        </form>

        <button
          className="text-sm underline"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          type="button"
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Log in"}
        </button>
      </section>
    </main>
  );
}
