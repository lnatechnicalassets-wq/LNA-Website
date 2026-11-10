import React from "react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LNA Staff Portal — Lead Nation Academy",
  description: "Restricted internal administrative portal for Lead Nation Academy.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface-base text-text-primary">{children}</div>;
}

