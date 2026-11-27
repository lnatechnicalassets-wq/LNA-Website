"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  recoveryNotice,
  recoveryPaymentLabels,
  recoveryRequestSchema,
  recoveryResultSchema,
  recoveryStatusLabels,
  type RecoveredApplication,
} from "@/lib/enrollment/recovery";

const fieldClass =
  "w-full min-h-11 rounded-lg border border-[#73939C] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]";
const buttonClass =
  "min-h-11 rounded-lg bg-[#086477] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]";
export function StatusLookupView({ enabled = false }: { enabled?: boolean }) {
  const params = useSearchParams();
  const [reference, setReference] = useState(params.get("ref") ?? "");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [applications, setApplications] = useState<RecoveredApplication[] | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const candidate = new URLSearchParams(window.location.hash.slice(1)).get("recovery");
    if (candidate && /^[a-f0-9]{64}$/.test(candidate)) {
      setToken(candidate);
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);

  async function submit(action: "request" | "redeem") {
    if (pending || !enabled) return;
    const input = recoveryRequestSchema.safeParse(
      action === "request" ? { action, email, reference } : { action, token }
    );
    if (!input.success) {
      setError("Enter a valid email and, if supplied, LNA Application ID.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    setApplications(null);
    try {
      const response = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.data),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const reason =
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : "Unable to check your application.";
        if (action === "redeem" && response.status === 400) setToken("");
        throw new Error(reason);
      }
      if (action === "request") setMessage(recoveryNotice);
      else {
        setApplications(recoveryResultSchema.parse(data).applications);
        setToken("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6FAFA] px-4 py-10 text-[#172E35] sm:py-16">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Find My Application</h1>
          <p className="text-sm text-[#526E77]">
            Check your registration and payment status using the email address you provided when
            applying.
          </p>
        </header>
        <section className="space-y-4 rounded-xl border border-[#C5E2E5] bg-white p-5 sm:p-6">
          {!enabled ? (
            <p role="status">
              Application status lookup is currently unavailable. Contact Lead Nation Academy for
              help.
            </p>
          ) : token ? (
            <>
              <h2 className="font-semibold">Open your applications</h2>
              <p className="text-sm">
                This secure email link can be used once. Continue to see the latest status.
              </p>
              <button
                className={buttonClass}
                disabled={pending}
                onClick={() => void submit("redeem")}
              >
                {pending ? "Checking…" : "View application status"}
              </button>
              <button
                className="block text-sm underline"
                disabled={pending}
                onClick={() => {
                  setToken("");
                  setError("");
                }}
              >
                Request a new link
              </button>
            </>
          ) : applications ? (
            <>
              <h2 className="font-semibold">Your applications</h2>
              <ul className="divide-y divide-[#C5E2E5]">
                {applications.map((item) => (
                  <li key={item.reference} className="space-y-1 py-4 text-sm">
                    <p className="font-mono text-xs">{item.reference}</p>
                    <h3 className="font-semibold">{item.course}</h3>
                    <p>{item.batch}</p>
                    <p className="font-medium text-[#086477]">
                      {recoveryStatusLabels[item.status]}
                    </p>
                    <p>{recoveryPaymentLabels[item.paymentStatus]}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-[#526E77]">
                Up to 20 recent applications are shown. If a payment is pending or under review, do
                not pay again until Admissions confirms the previous payment status.
              </p>
              <button
                className="text-sm underline"
                onClick={() => {
                  setApplications(null);
                  setEmail("");
                  setReference("");
                }}
              >
                Check another application
              </button>
            </>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("request");
              }}
            >
              <label className="block space-y-1 text-sm font-medium">
                <span>Email address</span>
                <input
                  type="email"
                  className={fieldClass}
                  required
                  autoComplete="email"
                  maxLength={160}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={pending}
                />
              </label>
              <label className="block space-y-1 text-sm font-medium">
                <span>LNA Application ID (optional)</span>
                <input
                  className={fieldClass}
                  maxLength={32}
                  placeholder="LNA-XXXX-XXXX"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  disabled={pending}
                />
              </label>
              <button className={buttonClass} type="submit" disabled={pending}>
                {pending ? "Requesting…" : "Send secure link"}
              </button>
            </form>
          )}
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </section>
        <p className="text-sm text-[#526E77]">
          Need help or used the wrong email?{" "}
          <Link href="/about" className="font-medium underline">
            Contact Lead Nation Academy.
          </Link>
        </p>
        <Link href="/courses" className="text-sm font-medium text-[#086477] underline">
          Browse courses
        </Link>
      </div>
    </main>
  );
}
