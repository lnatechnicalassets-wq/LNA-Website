import { NextResponse, type NextRequest } from "next/server";
import { poishaToBdtString } from "@/lib/money";
import { parseCurrentServerEnv } from "@/server/env";
import {
  signMockScenarioToken,
  type SignedMockCheckoutTokenPayload,
} from "@/server/payments/bkash";
import { verifyHmacToken } from "@/server/security/hmac";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Local development & testing mock hosted bKash Checkout page.
 * Unconditionally disabled with HTTP 404 in production or when BKASH_CHECKOUT_MODE !== "mock".
 */
export async function GET(request: NextRequest) {
  const env = parseCurrentServerEnv();
  if (env.NODE_ENV === "production" || env.BKASH_CHECKOUT_MODE !== "mock") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token") ?? "";
  const verified = verifyHmacToken<SignedMockCheckoutTokenPayload>(token);
  if (!verified || !verified.paymentId || !verified.tranId || !verified.amountPoisha) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Invalid Mock Checkout</title></head><body style="font-family:system-ui,sans-serif;padding:32px;background:#f6fafa;color:#172e35;"><h1>Mock bKash session expired or invalid</h1><p><a href="/enroll">Return to enrollment</a></p></body></html>`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const amountBdt = poishaToBdtString(BigInt(verified.amountPoisha));
  const callbackBase = verified.callbackUrl;
  const pid = encodeURIComponent(verified.paymentId);

  const successSig = encodeURIComponent(signMockScenarioToken(verified.paymentId, "success"));
  const pendingSig = encodeURIComponent(
    signMockScenarioToken(verified.paymentId, "pending_timeout")
  );
  const mismatchSig = encodeURIComponent(
    signMockScenarioToken(verified.paymentId, "amount_mismatch")
  );
  const currencySig = encodeURIComponent(
    signMockScenarioToken(verified.paymentId, "currency_mismatch")
  );
  const gatewayFailedSig = encodeURIComponent(
    signMockScenarioToken(verified.paymentId, "gateway_failed")
  );

  const successHref = `${callbackBase}?paymentID=${pid}&status=success&mockSig=${successSig}`;
  const cancelHref = `${callbackBase}?paymentID=${pid}&status=cancel`;
  const failHref = `${callbackBase}?paymentID=${pid}&status=failure`;
  const pendingHref = `${callbackBase}?paymentID=${pid}&status=success&mockSig=${pendingSig}`;
  const mismatchHref = `${callbackBase}?paymentID=${pid}&status=success&mockSig=${mismatchSig}`;
  const currencyMismatchHref = `${callbackBase}?paymentID=${pid}&status=success&mockSig=${currencySig}`;
  const gatewayDeclineHref = `${callbackBase}?paymentID=${pid}&status=success&mockSig=${gatewayFailedSig}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mock bKash Checkout Simulator (Dev Only) — Lead Nation Academy</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #F6FAFA; color: #172E35; padding: 24px 16px; }
    .card { max-width: 560px; margin: 24px auto; background: #FFFFFF; border: 1px solid #C5E2E5; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    h1 { font-size: 22px; margin: 12px 0 8px; }
    p { font-size: 14px; color: #526E77; line-height: 1.5; margin: 0 0 16px; }
    .meta { background: #EDF5F5; border: 1px solid #E1EDEE; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; }
    .mono { font-family: ui-monospace, monospace; font-weight: 600; color: #086477; }
    .actions { display: grid; gap: 10px; }
    a.btn { display: block; text-align: center; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 16px; border-radius: 10px; min-height: 44px; box-sizing: border-box; }
    .primary { background: #086477; color: #FFFFFF; }
    .warn { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
    .danger { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
    .outline { background: #FFFFFF; color: #172E35; border: 1px solid #C5DDE0; }
  </style>
</head>
<body>
  <main class="card">
    <span class="badge">Dev-Only Mock bKash Gateway</span>
    <h1>Authorize Payment to Lead Nation Academy</h1>
    <p>This local test simulator emulates hosted bKash Tokenized Checkout redirects and server-to-server execution outcomes without real funds.</p>
    <div class="meta">
      <div class="row"><span>Invoice Ref</span><span class="mono">${escapeHtml(verified.tranId)}</span></div>
      <div class="row"><span>Payment ID</span><span class="mono">${escapeHtml(verified.paymentId)}</span></div>
      <div class="row"><span>Payable Amount</span><span class="mono">BDT ${escapeHtml(amountBdt)}</span></div>
    </div>
    <div class="actions">
      <a class="btn primary" href="${escapeHtml(successHref)}">Simulate Success (Verified Completed)</a>
      <a class="btn outline" href="${escapeHtml(cancelHref)}">Simulate User Cancel (Retains Hold)</a>
      <a class="btn danger" href="${escapeHtml(failHref)}">Simulate Failure Callback (Retains Hold)</a>
      <a class="btn warn" href="${escapeHtml(pendingHref)}">Simulate Execute Timeout / Pending</a>
      <a class="btn warn" href="${escapeHtml(mismatchHref)}">Simulate Amount Tamper (Quarantine)</a>
      <a class="btn warn" href="${escapeHtml(currencyMismatchHref)}">Simulate Currency Mismatch (Quarantine)</a>
      <a class="btn danger" href="${escapeHtml(gatewayDeclineHref)}">Simulate Server Execute Decline</a>
    </div>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

