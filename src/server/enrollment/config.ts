import "server-only";
import { parseCurrentServerEnv } from "@/server/env";

export type CheckoutMode = "closed" | "mock" | "live";

export interface EnrollmentRuntimeConfig {
  checkoutMode: CheckoutMode;
  submissionEnabled: boolean;
  statusLookupEnabled: boolean;
  emailDispatchMode: "disabled" | "mock" | "live";
  bankTransferEnabled: false;
}

/**
 * Resolves authoritative runtime enrollment and status gates on the server.
 * Mock modes are hard-blocked in production; live checkout remains closed until
 * BKASH_CHECKOUT_MODE is explicitly switched to "live" with verified PGW secrets.
 */
export function getEnrollmentRuntimeConfig(): EnrollmentRuntimeConfig {
  const env = parseCurrentServerEnv();
  const effectiveCheckoutMode: CheckoutMode =
    env.NODE_ENV === "production" && env.BKASH_CHECKOUT_MODE === "mock"
      ? "closed"
      : env.BKASH_CHECKOUT_MODE;

  const submissionEnabled = effectiveCheckoutMode !== "closed";
  const statusLookupEnabled =
    env.STATUS_LOOKUP_ENABLED !== undefined
      ? env.STATUS_LOOKUP_ENABLED === "true"
      : submissionEnabled;

  const effectiveEmailMode =
    env.NODE_ENV === "production" && env.EMAIL_DISPATCH_MODE === "mock"
      ? "disabled"
      : env.EMAIL_DISPATCH_MODE;

  return {
    checkoutMode: effectiveCheckoutMode,
    submissionEnabled,
    statusLookupEnabled,
    emailDispatchMode: effectiveEmailMode,
    bankTransferEnabled: false,
  };
}
