"use client";

import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sandboxRefundCopy as copy } from "@/lib/admin-admissions";
import type { AdminPaymentAttemptView } from "@/server/enrollment/service";

type Refund = NonNullable<AdminPaymentAttemptView["sandboxRefund"]>;

interface SandboxRefundActionProps {
  enabled: boolean;
  attemptId: string;
  amount: string;
  transactionId: string;
  refund: Refund;
}

export function SandboxRefundAction({
  enabled,
  attemptId,
  amount,
  transactionId,
  refund,
}: SandboxRefundActionProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const status = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [localResult, setLocalResult] = useState<Refund | null>(null);
  const result = refund.state ? refund : localResult;
  const canSubmit = enabled && !result?.state;

  async function submitRefund() {
    if (inFlight.current || !canSubmit) return;
    inFlight.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/payments/bkash/sandbox-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentAttemptId: attemptId }),
      });
      const body = await response.json();
      if (
        response.ok &&
        body.ok === true &&
        typeof body.refundTrxId === "string" &&
        body.refundTrxId
      ) {
        setLocalResult({ state: "completed", trxId: body.refundTrxId });
        setOpen(false);
        router.refresh();
        return;
      }
      if (body.refundRequestSent === false) {
        setMessage(typeof body.message === "string" ? body.message : copy.failed);
        return;
      }
      if (response.ok || response.status >= 500 || body.code === "BKASH_REFUND_DUPLICATE") {
        setLocalResult({ state: "unconfirmed", trxId: null });
        const parts: string[] = [copy.uncertain];
        if (Number.isInteger(body.gatewayHttpStatus)) {
          parts.push(copy.gatewayHttpStatus(body.gatewayHttpStatus));
        }
        if (typeof body.gatewayCode === "string" && /^\d{1,8}$/.test(body.gatewayCode)) {
          parts.push(copy.gatewayCode(body.gatewayCode));
        }
        setMessage(parts.join(" "));
        router.refresh();
        return;
      }
      setMessage(typeof body.message === "string" ? body.message : copy.failed);
    } catch {
      setLocalResult({ state: "unconfirmed", trxId: null });
      setMessage(copy.uncertain);
      router.refresh();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (!canSubmit && !result?.state && !open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (inFlight.current) return;
        setOpen(next);
        if (next) setMessage("");
      }}
    >
      {canSubmit || open ? (
        <DialogTrigger asChild>
          <Button size="sm" className="min-h-9 px-2.5" disabled={!canSubmit}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {copy.button}
          </Button>
        </DialogTrigger>
      ) : result?.state ? (
        <span
          ref={status}
          role="status"
          tabIndex={-1}
          className="rounded-md border border-border-subtle bg-surface-muted px-2.5 py-2 text-xs font-medium text-primary-900"
        >
          {copy[result.state]}
          {result.trxId && (
            <span className="ml-2 font-mono">{copy.refundReference(result.trxId)}</span>
          )}
        </span>
      ) : null}
      <DialogContent
        className="w-[calc(100%_-_1.5rem)]"
        onCloseAutoFocus={(event) => {
          if (status.current) {
            event.preventDefault();
            status.current.focus();
          }
        }}
      >
        <DialogTitle className="pr-7">{copy.button}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
        <dl className="grid gap-3 rounded-lg bg-surface-muted p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-secondary">{copy.amount}</dt>
            <dd className="font-semibold text-primary-900">{amount}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{copy.transactionId}</dt>
            <dd className="break-all font-mono text-primary-900">{transactionId}</dd>
          </div>
        </dl>
        {message && (
          <p role="alert" className="text-sm text-status-danger-text">
            {message}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="min-h-11" disabled={pending}>
              {copy.cancel}
            </Button>
          </DialogClose>
          {canSubmit && (
            <Button
              variant="danger"
              className="min-h-11"
              onClick={submitRefund}
              isLoading={pending}
            >
              {pending ? copy.submitting : copy.confirm}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
