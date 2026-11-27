"use client";

import React, {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { RecordPurgeImpact, usePurgeImpact } from "@/components/admin/purge-impact";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { enrollmentActionCopy as copy } from "@/lib/admin-admissions";
import { manualStudentFields } from "@/lib/admin-manual-admission";
import { adminPaths } from "@/lib/admin-navigation";
import { formatPaymentMethodLabel } from "@/lib/enrollment/status";
import { formatPoishaToBDT } from "@/lib/money";
import type { AdminEnrollmentListItem } from "@/server/enrollment/service";
import { reviewManualPayment } from "./[id]/manual-payment-actions";
import { ManualPaymentReview } from "./[id]/manual-payment-review";
import { manageEnrollmentRecord } from "./enrollment-record-actions";

type Operation = "edit" | "archive" | "restore" | "confirm" | "delete";
type ActionItem = Pick<
  AdminEnrollmentListItem,
  | "id"
  | "publicRef"
  | "fullName"
  | "email"
  | "phone"
  | "updatedAt"
  | "archivedAt"
  | "isStaffManualPayment"
  | "isApplicantManualPayment"
  | "submittedPaymentRef"
  | "paymentMethod"
  | "paymentStatus"
  | "status"
  | "payablePoisha"
>;

const viewClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-border-default px-2.5 text-xs font-medium text-primary-900 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
const fieldClass =
  "block min-h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

function RecordMutationForm({
  item,
  operation,
  cancel,
  onSuccess,
  returnView,
  impactToken,
}: {
  item: ActionItem & { updatedAt: string };
  operation: Exclude<Operation, "confirm">;
  cancel: React.ReactNode;
  onSuccess: () => void;
  returnView?: "applications" | "archived";
  impactToken?: string;
}) {
  const [state, submit, pending] = useActionState(
    manageEnrollmentRecord.bind(null, {
      id: item.id,
      revision: item.updatedAt,
      operation,
      returnView,
    }),
    {}
  );
  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form
      action={submit}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => submit(data));
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        {operation === "edit" &&
          manualStudentFields.map(({ name, label, type, maxLength }) => (
            <label key={name} className="block space-y-1 text-sm font-medium">
              <span>{label}</span>
              <input
                name={name}
                type={type}
                maxLength={maxLength}
                defaultValue={item[name]}
                required
                className={fieldClass}
              />
            </label>
          ))}
        {operation === "edit" && (
          <>
            <label className="block space-y-1 text-sm font-medium">
              <span>Reason for correction</span>
              <textarea name="reason" required maxLength={500} rows={2} className={fieldClass} />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="attested" required />
              <span>
                I verified these details belong to the same applicant. Previous payment and sent
                email records will be preserved.
              </span>
            </label>
            <Link href={adminPaths.studentDirectory} className="text-sm font-medium underline">
              Open Students to update a linked student profile first
            </Link>
          </>
        )}
        {operation === "delete" && <input type="hidden" name="impactToken" value={impactToken} />}
        {operation === "delete" && (
          <label className="block space-y-1 text-sm font-medium">
            <span>{copy.deleteConfirmation(item.publicRef)}</span>
            <input
              name="confirmation"
              required
              maxLength={13}
              autoComplete="off"
              className={fieldClass}
            />
          </label>
        )}
        {state.message && (
          <p role="alert" className="text-sm text-status-danger-text">
            {state.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            className="min-h-11"
            variant={operation === "archive" || operation === "delete" ? "danger" : "primary"}
            isLoading={pending}
          >
            {operation === "edit" ? copy.save : copy[operation]}
          </Button>
          {cancel}
        </div>
      </fieldset>
    </form>
  );
}

export function EnrollmentRowActions({
  item,
  showView = true,
  allowPurge = true,
  leadingAction,
}: {
  item: ActionItem;
  showView?: boolean;
  allowPurge?: boolean;
  leadingAction?: React.ReactNode;
}) {
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState<Operation | null>(null);
  const complete = useCallback(() => {
    setOpen(null);
    setNotice(open === "delete" ? copy.deleted : copy.saved);
    router.refresh();
  }, [open, router]);

  const revision = item.updatedAt;
  const { impact, resetImpact } = usePurgeImpact("admission", item.id, open === "delete");
  const mayDelete = impact?.status === "eligible";
  const protectedPayment = impact?.status === "payment_protected";
  const canConfirm =
    revision &&
    (item.isStaffManualPayment || item.isApplicantManualPayment) &&
    !item.archivedAt &&
    item.status === "application_in_process" &&
    item.paymentStatus === "pending_verification" &&
    (item.paymentMethod === "bkash" || item.paymentMethod === "bank_transfer") &&
    item.submittedPaymentRef;
  const archiveOperation = item.archivedAt ? "restore" : "archive";
  const ArchiveIcon = item.archivedAt ? RotateCcw : Archive;
  const descriptions = {
    edit: copy.updateContact,
    archive: copy.archiveDescription,
    restore: copy.restoreDescription,
    confirm: copy.confirmDescription,
    delete: copy.deleteDescription,
  };
  const cancel = (
    <DialogClose asChild>
      <Button type="button" variant="outline" className="min-h-11">
        {copy.cancel}
      </Button>
    </DialogClose>
  );

  function show(operation: Operation, button: HTMLButtonElement) {
    if (operation === "delete") resetImpact();
    trigger.current = button;
    setNotice("");
    setOpen(operation);
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-1.5 max-[419px]:grid max-[419px]:grid-cols-2">
      {leadingAction}
      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        {showView && (
          <Link
            className={viewClass}
            href={`${adminPaths.admissions}/${encodeURIComponent(item.id)}`}
            aria-label={`${copy.view} ${item.publicRef}`}
          >
            <Eye aria-hidden="true" className="size-3.5" />
            {copy.view}
          </Link>
        )}
        {revision && !item.archivedAt && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-9 px-2"
            aria-label={`${copy.edit} ${item.publicRef}`}
            aria-haspopup="dialog"
            onClick={(event) => show("edit", event.currentTarget)}
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            {copy.edit}
          </Button>
        )}
        {canConfirm && (
          <Button
            size="sm"
            className="min-h-9 px-2.5"
            aria-label={`${copy.confirm} ${item.publicRef}`}
            aria-haspopup="dialog"
            onClick={(event) => show("confirm", event.currentTarget)}
          >
            {copy.confirm}
          </Button>
        )}
        {revision && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-9 px-2"
            aria-label={`${copy[archiveOperation]} ${item.publicRef}`}
            aria-haspopup="dialog"
            onClick={(event) => show(archiveOperation, event.currentTarget)}
          >
            <ArchiveIcon aria-hidden="true" className="size-3.5" />
            {copy[archiveOperation]}
          </Button>
        )}
        {revision && !showView && allowPurge && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-9 px-2 text-status-danger-text hover:bg-status-danger-bg"
            aria-label={`${copy.deleteButton} ${item.publicRef}`}
            aria-haspopup="dialog"
            onClick={(event) => show("delete", event.currentTarget)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {copy.delete}
          </Button>
        )}
        {open && (
          <DialogContent
            className="max-h-[85vh] w-[calc(100%_-_1.5rem)] overflow-y-auto text-left"
            onCloseAutoFocus={(event) => {
              if (trigger.current?.isConnected) {
                event.preventDefault();
                trigger.current.focus();
              }
            }}
          >
            <DialogTitle className="pr-7">
              {open === "delete" && impact && !mayDelete
                ? copy.deleteUnavailable
                : `${copy[open]} ${item.publicRef}`}
            </DialogTitle>
            <DialogDescription>{descriptions[open]}</DialogDescription>
            {open === "delete" && (
              <>
                <div className="rounded-lg bg-surface-subtle px-3 py-2 text-sm">
                  <p className="font-medium text-primary-900">{item.fullName}</p>
                  <p className="font-mono text-xs text-text-secondary">{item.publicRef}</p>
                </div>
                <RecordPurgeImpact impact={impact} />
              </>
            )}
            {open === "confirm" &&
              revision &&
              (item.paymentMethod === "bkash" || item.paymentMethod === "bank_transfer") && (
                <>
                  <dl className="grid gap-2 rounded-lg bg-surface-muted p-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-text-secondary">{copy.expectedPayment}</dt>
                      <dd className="font-semibold">{formatPoishaToBDT(item.payablePoisha)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">
                        {copy.reference(formatPaymentMethodLabel(item.paymentMethod))}
                      </dt>
                      <dd className="break-all font-mono font-semibold">
                        {item.submittedPaymentRef}
                      </dd>
                    </div>
                  </dl>
                  <ManualPaymentReview
                    paymentMethod={item.paymentMethod}
                    action={reviewManualPayment.bind(null, {
                      id: item.id,
                      revision,
                      stayOnPage: true,
                    })}
                    onSuccess={complete}
                    cancel={cancel}
                  />
                </>
              )}
            {open === "delete" && !mayDelete && (
              <div className="flex flex-wrap justify-end gap-2">
                {cancel}
                {protectedPayment && !item.archivedAt && (
                  <Button variant="secondary" onClick={() => setOpen("archive")}>
                    {copy.archive}
                  </Button>
                )}
              </div>
            )}
            {open !== "confirm" && revision && (open !== "delete" || mayDelete) && (
              <RecordMutationForm
                key={open}
                item={{ ...item, updatedAt: revision }}
                operation={open}
                cancel={cancel}
                onSuccess={complete}
                returnView={item.archivedAt ? "archived" : "applications"}
                impactToken={impact?.status === "eligible" ? impact.token : undefined}
              />
            )}
          </DialogContent>
        )}
      </Dialog>
      {notice && (
        <span role="status" className="w-full text-xs text-text-secondary">
          {notice}
        </span>
      )}
    </div>
  );
}
