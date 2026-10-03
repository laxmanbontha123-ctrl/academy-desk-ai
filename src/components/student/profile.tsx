"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { formatDate } from "@/lib/format";
import type { UserProfile } from "@/types/academy";
import { Badge, Card, SectionHeading, Skeleton } from "./ui";

type ProfileProps = {
  profile: UserProfile | null;
  loading: boolean;
  fallbackEmail?: string | null;
  fallbackPhone?: string | null;
};

export function Profile({
  profile,
  loading,
  fallbackEmail,
  fallbackPhone,
}: ProfileProps) {
  const item: UserProfile =
    profile ?? {
      id: "missing",
      name: "Student",
      role: "student",
      status: "active",
    };

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name ?? "Student");
  const [email, setEmail] = useState(
    item.email ?? fallbackEmail ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (loading) {
    return (
      <>
        <SectionHeading title="Profile" />
        <Skeleton className="h-64" />
      </>
    );
  }

  async function saveProfile() {
    setError("");
    setSaved(false);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
      setError("Name must be between 2 and 80 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      setSaving(true);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update your profile.");
      }

      setName(cleanName);
      setEmail(cleanEmail);
      setSaved(true);
      setEditing(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setName(item.name ?? "Student");
    setEmail(item.email ?? fallbackEmail ?? "");
    setError("");
    setSaved(false);
    setEditing(false);
  }

  return (
    <div>
      <SectionHeading
        title="Profile"
        detail="Manage your student profile information."
      />

      <Card className="max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white">
              Personal information
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Update your display name and profile email.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setSaved(false);
                setEditing(true);
              }}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Name
              </span>

              <input
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Profile email
              </span>

              <input
                type="email"
                value={email}
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                This updates your AcademyDesk profile email.
              </p>
            </label>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={saveProfile}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={cancelEdit}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {saved && (
              <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                Profile updated successfully.
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ["Name", item.name ?? "Student"],
                ["Email", item.email ?? fallbackEmail ?? "—"],
                ["Phone", item.phone ?? fallbackPhone ?? "—"],
                ["Status", item.status ?? "—"],
                ["Role", item.role ?? "student"],
                ["Member since", formatDate(item.createdAt, "—")],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 font-bold text-white">
                    {label === "Status" || label === "Role" ? (
                      <Badge tone="green">{value}</Badge>
                    ) : (
                      value
                    )}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
