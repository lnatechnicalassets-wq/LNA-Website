import { NextResponse, type NextRequest } from "next/server";
import { processBkashCallback } from "@/server/enrollment/service";
import { resolveSafeAppOrigin } from "@/server/security/origin";

function extractQueryParams(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function handleCallback(request: NextRequest) {
  const url = new URL(request.url);
  const queryParams = extractQueryParams(url);
  let bodyParams: Record<string, unknown> = {};

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const parsed = (await request.json()) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          bodyParams = parsed as Record<string, unknown>;
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        formData.forEach((v, k) => {
          bodyParams[k] = typeof v === "string" ? v : "";
        });
      }
    } catch {
      bodyParams = {};
    }
  }

  const merged: Record<string, unknown> = { ...queryParams, ...bodyParams };
  const paymentID =
    typeof merged.paymentID === "string"
      ? merged.paymentID
      : typeof merged.paymentId === "string"
        ? merged.paymentId
        : null;
  const status = typeof merged.status === "string" ? merged.status : null;
  const merchantInvoiceNumber =
    typeof merged.merchantInvoiceNumber === "string" ? merged.merchantInvoiceNumber : null;
  const tranId = typeof merged.tranId === "string" ? merged.tranId : null;
  const mockSig = typeof merged.mockSig === "string" ? merged.mockSig : null;

  const origin = resolveSafeAppOrigin(request);
  try {
    const result = await processBkashCallback(
      {
        paymentID,
        status,
        merchantInvoiceNumber,
        tranId,
        mockSig,
        rawParams: merged,
      },
      { origin }
    );

    return NextResponse.redirect(result.redirectUrl, {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.redirect(`${origin}/enroll?outcome=pending`, {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function GET(request: NextRequest) {
  return handleCallback(request);
}

export async function POST(request: NextRequest) {
  return handleCallback(request);
}

