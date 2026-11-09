import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PublicShell } from "@/components/public";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Lead Nation Academy | LNA",
  description: "Official rebuild of lnabd.org for Lead Nation Academy.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PublicShell>{children}</PublicShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
