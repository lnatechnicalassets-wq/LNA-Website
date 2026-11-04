import { NextResponse } from "next/server";
import { env } from "@/env";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for container / serverless monitoring and uptime assertions.
 * Conforms to SRS NFR-OBS-01 and NFR-SEC-02:
 * Strictly scrubs all credentials, database passwords, and secrets from telemetry responses.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor(process.uptime());

  // Non-sensitive health telemetry payload
  const healthData = {
    status: "healthy",
    timestamp,
    uptime,
    environment: env.NODE_ENV,
    version: "0.1.0",
    checks: {
      server: "ok",
      environment: "ok",
    },
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Content-Type": "application/json",
    },
  });
}
