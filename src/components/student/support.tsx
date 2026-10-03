"use client";

import { useState, type FormEvent } from "react";
import type { Course } from "@/types/academy";
import { Card, SectionHeading } from "./ui";

type AgentResult = {
  answer?: string;
  error?: string;
};

export function Support({
  user,
  courses,
  initialMessage,
  onConsumed,
}: {
  user: { getIdToken: () => Promise<string> };
  enrollments: unknown[];
  courses: Course[];
  initialMessage?: string;
  onConsumed: () => void;
}) {
  const [message, setMessage] = useState(initialMessage ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");

  async function askAgent(event?: FormEvent) {
    event?.preventDefault();

    const cleanMessage = message.trim();

    if (cleanMessage.length < 3) {
      setError("Please describe what you need help with.");
      return;
    }

    setBusy(true);
    setError("");
    setAnswer("");

    try {
      const token = await user.getIdToken();

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: cleanMessage,
        }),
      });

      const result = (await response.json()) as AgentResult;

      if (!response.ok) {
        throw new Error(
          result.error ?? "The AcademyDesk AI Agent could not complete this request.",
        );
      }

      setAnswer(result.answer ?? "I could not complete that request.");
      setMessage("");
      onConsumed();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The AI support agent is temporarily unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  function selectSuggestion(text: string) {
    setMessage(text);
    setError("");
    setAnswer("");
  }

  return (
    <div>
      <SectionHeading
        title="AcademyDesk AI Agent"
        detail="Your AI support agent can understand your request, check your academy data and take the next action."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="max-w-4xl">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                AI Agent Online
              </div>

              <h3 className="text-2xl font-black text-white">
                Tell me what you need.
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                I can check your courses, payments, upcoming classes and
                previous support requests. When human action is required, I
                can create a support ticket automatically.
              </p>
            </div>
          </div>

          <form onSubmit={askAgent} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-200">
                Ask AcademyDesk AI
              </span>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Example: When is my next class? / My fee still shows pending / I cannot access my course..."
                className="min-h-48 w-full resize-y rounded-2xl border border-white/10 bg-white px-4 py-4 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                maxLength={2000}
              />
            </label>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Ask naturally — no category required.</span>
              <span>{message.length}/2000</span>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || message.trim().length < 3}
              className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "AI Agent is working..." : "Ask AcademyDesk AI →"}
            </button>
          </form>

          {answer && (
            <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-400/15 text-sm font-black text-blue-300">
                  AI
                </div>

                <p className="text-sm font-bold text-blue-200">
                  AcademyDesk AI Agent
                </p>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                {answer}
              </p>
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
              Try asking
            </p>

            <div className="mt-4 space-y-2">
              {[
                "What is my next class?",
                "Show my pending payments.",
                "How am I progressing in my courses?",
                "What support tickets have I raised?",
                "My fee payment is still pending. Can you check it?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              What the agent can do
            </p>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>✓ Understand your request</p>
              <p>✓ Check your academy data</p>
              <p>✓ Answer routine questions</p>
              <p>✓ Create support tickets</p>
              <p>✓ Escalate issues needing people</p>
            </div>
          </Card>

          {courses.length > 0 && (
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Your academy
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {courses.length}
              </p>

              <p className="text-xs text-slate-400">
                courses are available in your workspace.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

