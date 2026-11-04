import type { Metadata } from "next";
import { PublicShell } from "@/components/public";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Lead Nation Academy | LNA",
  description: "Official rebuild of lnabd.org for Lead Nation Academy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
