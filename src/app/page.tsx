"use client";

import { signInWithCustomToken } from "firebase/auth";
import { FormEvent, useEffect, useState } from "react";
import { StudentDashboard } from "@/components/student/dashboard-shell";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const {
    user,
    loading,
    sendEmailOtp,
    verifyEmailOtp,
    logout,
  } = useAuth();

  const [loginRole, setLoginRole] = useState<"student" | "admin">("student");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        Loading AcademyDesk AI...
      </main>
    );
  }

  if (user) {
    return (
      <StudentDashboard
        user={user}
        onLogout={logout}
        loginRole={loginRole}
      />
    );
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await sendEmailOtp(email.trim().toLowerCase());
      setEmailSent(true);
      setCooldown(60);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to send the verification code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await verifyEmailOtp(email.trim().toLowerCase(), emailCode);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to verify the code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendEmail() {
    if (cooldown > 0 || busy) return;

    setBusy(true);
    setError("");

    try {
      await sendEmailOtp(email.trim().toLowerCase());
      setCooldown(60);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to resend the verification code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function demoStudentLogin() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/demo-student", {
        method: "POST",
      });

      const result = (await response.json()) as {
        token?: string;
        error?: string;
      };

      if (!response.ok || !result.token) {
        throw new Error(result.error ?? "Demo student login failed.");
      }

      await signInWithCustomToken(auth, result.token);
      setLoginRole("student");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Demo student login failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function selectRole(role: "student" | "admin") {
    setLoginRole(role);
    setError("");
    setEmailSent(false);
    setEmailCode("");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:block">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl font-black text-slate-950 shadow-lg">
              A
            </div>
            <div>
              <h1 className="text-lg font-bold">AcademyDesk AI</h1>
              <p className="text-xs text-slate-400">
                Student Support & Helpdesk
              </p>
            </div>
          </div>

          <p className="text-sm font-semibold text-blue-300">
            Your academy, in one place.
          </p>

          <h2 className="mt-3 max-w-xl text-4xl font-black tracking-tight text-white sm:text-6xl">
            Learn confidently. Get help quickly.
          </h2>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
            Track your courses, schedule, payments, opportunities and
            AI-assisted support requests from one student dashboard.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["AI", "Smart triage"],
              ["24×7", "Support desk"],
              ["Secure", "OTP access"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
              >
                <p className="text-lg font-black text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">
          <div className="mb-7 lg:hidden">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl font-black text-slate-950">
              A
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
              AcademyDesk AI
            </p>
          </div>

          <h3 className="text-3xl font-black tracking-tight text-white">
            Welcome back
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Sign in with a one-time verification code. No password required.
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => selectRole("student")}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                loginRole === "student"
                  ? "bg-white text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Student
            </button>

            <button
              type="button"
              onClick={() => selectRole("admin")}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                loginRole === "admin"
                  ? "bg-white text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Admin
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-xs text-blue-100">
            {loginRole === "student"
              ? "Student access • Continue to your student workspace."
              : "Admin access • Use the authorized admin account."}
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              or
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {loginRole === "student" ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm leading-6 text-blue-100">
                Your student workspace is ready. Continue to open your
                courses, schedule, payments and support desk.
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={demoStudentLogin}
                disabled={busy}
                className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:opacity-50"
              >
                {busy ? "Opening workspace..." : "Continue as Student →"}
              </button>
            </div>
          ) : !emailSent ? (
            <form onSubmit={submitEmail} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-200">
                  Email address
                </span>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:opacity-50"
              >
                {busy ? "Sending code..." : "Send Email OTP →"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyEmail} className="space-y-5">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-100">
                Verification code sent to <strong>{email}</strong>.
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-200">
                  6-digit verification code
                </span>

                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={emailCode}
                  onChange={(event) =>
                    setEmailCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.45em] text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || emailCode.length !== 6}
                className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Verify & Continue →"}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEmailSent(false);
                    setEmailCode("");
                    setError("");
                  }}
                  className="font-semibold text-slate-300 hover:text-white"
                >
                  ← Change email
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || busy}
                  onClick={resendEmail}
                  className="font-semibold text-blue-300 disabled:text-slate-600"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}          <p className="mt-8 text-center text-xs leading-5 text-slate-500">
            AcademyDesk AI • Secure student support and AI-assisted ticket
            triage.
          </p>
        </section>
      </div>
    </main>
  );
}


