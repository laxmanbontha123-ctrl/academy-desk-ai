"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

type TicketResult = {
  ticketId: string;
  ticketNumber: string;
  status: string;
  category: string;
  priority: string;
  priorityReason: string;
  department: string;
  sentiment: string;
  summary: string;
  suggestedReply: string;
  escalated: boolean;
  escalationReason: string | null;
  triageSource: string;
};

export default function Home() {
  const { user, loading, sendEmailOtp, verifyEmailOtp, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [message, setMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);

    try {
      await sendEmailOtp(email.trim().toLowerCase());
      setOtpSent(true);
      setCooldown(60);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to send the verification code.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);

    try {
      await verifyEmailOtp(email.trim().toLowerCase(), otp.trim());
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to verify the code.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0 || authBusy) return;

    setAuthError("");
    setAuthBusy(true);

    try {
      await sendEmailOtp(email.trim().toLowerCase());
      setCooldown(60);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to resend the verification code.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTicketError("");
    setTicketResult(null);

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      setTicketError("Please describe your issue in at least 10 characters.");
      return;
    }

    if (trimmedMessage.length > 2000) {
      setTicketError("Your issue must be 2000 characters or less.");
      return;
    }

    setTicketSubmitting(true);

    try {
      const token = await user?.getIdToken();

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      const result = (await response.json()) as TicketResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create your ticket.");
      }

      setTicketResult(result);
      setMessage("");
    } catch (error) {
      setTicketError(
        error instanceof Error
          ? error.message
          : "Unable to create your support request.",
      );
    } finally {
      setTicketSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-200 shadow-xl backdrop-blur">
          Loading AcademyDesk AI...
        </div>
      </main>
    );
  }

  if (user) {
    const displayName = user.email?.split("@")[0] ?? "Student";

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_30%)]">
          <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-950 shadow-lg">
                  <span className="text-lg font-black">A</span>
                </div>

                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    AcademyDesk AI
                  </h1>
                  <p className="text-xs text-slate-400">
                    Student Support & Helpdesk
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-100">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-400">Student</p>
                </div>

                <button
                  type="button"
                  onClick={() => logout().catch(() => undefined)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Log out
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
            <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  AI support is online
                </div>

                <p className="text-sm font-medium text-slate-400">
                  Welcome back 👋
                </p>

                <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Get help without the back-and-forth.
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Tell AcademyDesk AI what went wrong. Your request is
                  analysed, prioritised and routed to the right support team.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                  Smart triage
                </p>

                <div className="mt-6 space-y-5">
                  {[
                    ["01", "Describe", "Explain the issue naturally."],
                    ["02", "Analyse", "AI identifies category and priority."],
                    ["03", "Route", "Your ticket reaches the right team."],
                  ].map(([number, title, description]) => (
                    <div key={number} className="flex gap-4">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-xs font-bold text-white">
                        {number}
                      </div>

                      <div>
                        <p className="font-semibold text-white">{title}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-black/20 sm:p-8">
              <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                    Support desk
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                    Raise a support ticket
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    You do not need to pick a category. AI triage handles that
                    automatically.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                  Secure • AI-assisted
                </div>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-800">
                    Describe your issue
                  </span>

                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Example: I paid my semester fee yesterday, but the student portal still shows my payment as pending..."
                    maxLength={2000}
                    minLength={10}
                    required
                    className="min-h-48 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Minimum 10 characters</span>
                  <span>{message.length}/2000</span>
                </div>

                {ticketError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {ticketError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ticketSubmitting
                    ? "Analysing your issue..."
                    : "Create Support Ticket →"}
                </button>
              </form>
            </section>

            {ticketResult && (
              <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-xl backdrop-blur sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      Ticket created successfully
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-white">
                      {ticketResult.ticketNumber}
                    </h3>
                  </div>

                  <span className="w-fit rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    {ticketResult.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Category", ticketResult.category],
                    ["Priority", ticketResult.priority],
                    ["Department", ticketResult.department],
                    ["Triage", ticketResult.triageSource],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                    >
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="mt-1 font-bold text-white capitalize">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                    AI Summary
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {ticketResult.summary}
                  </p>
                </div>

                {ticketResult.suggestedReply && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                      Suggested Support Reply
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {ticketResult.suggestedReply}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(14,165,233,0.18),transparent_28%)] px-5 py-8 sm:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden lg:block">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-blue-200">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              AcademyDesk AI
            </div>

            <h1 className="max-w-2xl text-6xl font-black tracking-tight">
              One desk for every student support request.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
              Secure OTP sign-in, AI-powered issue triage and a faster path
              from problem to resolution.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["OTP", "Secure sign-in"],
                ["AI", "Smart triage"],
                ["24×7", "Always available"],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"
                >
                  <p className="text-lg font-black">{title}</p>
                  <p className="mt-1 text-xs text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.08] p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">
            <div className="mb-8">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-950">
                <span className="text-xl font-black">A</span>
              </div>

              <h2 className="text-3xl font-black tracking-tight">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Sign in with a one-time verification code. No password
                required.
              </p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-200">
                    Email address
                  </span>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3.5 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                  />
                </label>

                {authError && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:opacity-50"
                >
                  {authBusy ? "Sending code..." : "Send Email OTP →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-100">
                  Verification code sent to <strong>{email}</strong>.
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-200">
                    6-digit OTP
                  </span>

                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      )
                    }
                    placeholder="000000"
                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.45em] text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                  />
                </label>

                {authError && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authBusy || otp.length !== 6}
                  className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:opacity-50"
                >
                  {authBusy ? "Verifying..." : "Verify & Continue →"}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setAuthError("");
                    }}
                    className="font-semibold text-slate-300 hover:text-white"
                  >
                    ← Change email
                  </button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || authBusy}
                    onClick={handleResendOtp}
                    className="font-semibold text-blue-300 disabled:text-slate-600"
                  >
                    {cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-8 text-center text-xs leading-5 text-slate-500">
              By continuing, you agree to use AcademyDesk AI for legitimate
              student support requests.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
