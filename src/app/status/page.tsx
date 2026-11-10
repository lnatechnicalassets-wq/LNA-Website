import React, { Suspense } from "react";
import type { Metadata } from "next";
import { StatusLookupView } from "./status-lookup-view";

export const metadata: Metadata = {
  title: "Application Status — Lead Nation Academy",
  description:
    "Check your Lead Nation Academy program application status using your LNA Application ID and email address or phone number.",
  openGraph: {
    title: "Application Status — Lead Nation Academy",
    description:
      "Check your Lead Nation Academy program application status using your LNA Application ID and email address or phone number.",
  },
};

export default function ApplicationStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full bg-[#F6FAFA] min-h-screen py-16 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#086477] border-t-transparent animate-spin" />
        </div>
      }
    >
      <StatusLookupView />
    </Suspense>
  );
}
