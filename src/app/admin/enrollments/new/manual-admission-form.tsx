"use client";

import React, { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  manualAdmissionCopy as copy,
  manualAnswerField,
  manualStudentFields,
  type ManualAdmissionBatchOption,
  type ManualAdmissionState,
} from "@/lib/admin-manual-admission";
import { adminEnrollmentsHref, adminPaths } from "@/lib/admin-navigation";

const fieldClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 aria-invalid:border-status-danger-border disabled:opacity-60";
const cardClass = "space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6";
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function ManualAdmissionForm({
  batches,
  initialBatchId,
  save,
}: {
  batches: ManualAdmissionBatchOption[];
  initialBatchId?: string;
  save: (state: ManualAdmissionState, formData: FormData) => Promise<ManualAdmissionState>;
}) {
  const courses = [...new Map(batches.map((batch) => [batch.courseId, batch.courseTitle]))].sort(
    ([, a], [, b]) => a.localeCompare(b, "en")
  );
  const initialBatch = batches.find((batch) => batch.id === initialBatchId);
  const [courseId, setCourseId] = useState(
    initialBatch?.courseId ?? (courses.length === 1 ? courses[0][0] : "")
  );
  const [batchId, setBatchId] = useState(initialBatch?.id ?? "");
  const [showResult, setShowResult] = useState(false);
  const [state, action, pending] = useActionState(save, {});
  const [values, setValues] = useState<Record<string, string>>({});

  const batchOptions = batches.filter((batch) => batch.courseId === courseId);
  const selected =
    batchOptions.find((batch) => batch.id === batchId) ??
    (batchOptions.length === 1 ? batchOptions[0] : null);
  const result = showResult ? state : {};
  const fields = [
    ...manualStudentFields.map((field) => ({ ...field, required: true, options: undefined })),
    ...(selected?.questions ?? []).map((question) => ({
      name: manualAnswerField(question.id),
      label: question.label,
      type: question.type,
      required: question.required,
      maxLength: 2000,
      options: question.options,
    })),
  ];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setShowResult(true);
        startTransition(() => action(data));
      }}
    >
      <fieldset disabled={pending} aria-busy={pending} className="space-y-4">
        <section className={cardClass} aria-labelledby="admission-batch-heading">
          <h2 id="admission-batch-heading" className="font-semibold text-primary-900">
            {copy.chooseBatchHeading}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="admission-course" className="block text-sm font-medium">
                {copy.course}
              </label>
              <select
                id="admission-course"
                value={courseId}
                className={fieldClass}
                onChange={(event) => {
                  setCourseId(event.currentTarget.value);
                  setBatchId("");
                  setShowResult(false);
                  setValues((previous) =>
                    Object.fromEntries(
                      manualStudentFields.map(({ name }) => [name, previous[name] ?? ""])
                    )
                  );
                }}
              >
                <option value="">{copy.chooseCourse}</option>
                {courses.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="admission-batch" className="block text-sm font-medium">
                {copy.batch}
              </label>
              <select
                id="admission-batch"
                value={selected?.id ?? ""}
                className={fieldClass}
                disabled={!courseId}
                onChange={(event) => {
                  setBatchId(event.currentTarget.value);
                  setShowResult(false);
                }}
              >
                <option value="" disabled={batchOptions.length === 1}>
                  {courseId ? copy.chooseBatch : copy.chooseCourseFirst}
                </option>
                {batchOptions.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} · {dateFormatter.format(new Date(batch.startDate))}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selected && (
            <div className="space-y-2 border-t border-border-subtle pt-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4">
                <dl className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-sm text-text-secondary">{copy.fee}</dt>
                  <dd className="font-semibold text-primary-900">{selected.fee}</dd>
                </dl>
                <Link
                  href={adminEnrollmentsHref({ view: "students", batchId: selected.id })}
                  className="inline-flex min-h-11 items-center text-sm text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  {copy.roster}
                </Link>
              </div>
              <p className="text-sm text-text-secondary">
                {selected.isFree ? copy.freeDescription : copy.paidDescription}
              </p>
            </div>
          )}
        </section>

        {selected && !selected.isFree && (
          <section className={cardClass} aria-labelledby="admission-payment-heading">
            <h2 id="admission-payment-heading" className="font-semibold text-primary-900">
              {copy.paymentDetails}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="paymentMethod" className="block text-sm font-medium">
                  {copy.paymentMethod}
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  className={fieldClass}
                  value={values.paymentMethod ?? ""}
                  onChange={(event) => {
                    const paymentMethod = event.currentTarget.value;
                    setValues((previous) => ({ ...previous, paymentMethod, paymentReference: "" }));
                  }}
                  required
                  aria-invalid={Boolean(result.fieldErrors?.paymentMethod)}
                  aria-describedby={
                    result.fieldErrors?.paymentMethod ? "payment-method-error" : undefined
                  }
                >
                  <option value="">{copy.choosePaymentMethod}</option>
                  <option value="bkash">{copy.bkash}</option>
                  <option value="bank_transfer">{copy.bankTransfer}</option>
                </select>
                {result.fieldErrors?.paymentMethod?.[0] && (
                  <p id="payment-method-error" className="text-sm text-status-danger-text">
                    {result.fieldErrors.paymentMethod[0]}
                  </p>
                )}
              </div>
              {values.paymentMethod && (
                <div className="space-y-1">
                  <label htmlFor="paymentReference" className="block text-sm font-medium">
                    {values.paymentMethod === "bkash" ? copy.bkashReference : copy.bankReference}
                  </label>
                  <input
                    id="paymentReference"
                    name="paymentReference"
                    className={fieldClass}
                    value={values.paymentReference ?? ""}
                    onChange={(event) => {
                      const paymentReference = event.currentTarget.value;
                      setValues((previous) => ({ ...previous, paymentReference }));
                    }}
                    required
                    maxLength={128}
                    aria-invalid={Boolean(result.fieldErrors?.paymentReference)}
                    aria-describedby={
                      result.fieldErrors?.paymentReference
                        ? "payment-reference-error"
                        : "payment-reference-help"
                    }
                  />
                  {result.fieldErrors?.paymentReference?.[0] ? (
                    <p id="payment-reference-error" className="text-sm text-status-danger-text">
                      {result.fieldErrors.paymentReference[0]}
                    </p>
                  ) : (
                    <p id="payment-reference-help" className="text-sm text-text-secondary">
                      {copy.referenceHelp}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {selected && (
          <section className={cardClass} aria-labelledby="admission-details-heading">
            <h2 id="admission-details-heading" className="font-semibold text-primary-900">
              {copy.studentDetails}
            </h2>
            <input type="hidden" name="batchId" value={selected.id} />
            <input type="hidden" name="batchRevision" value={selected.revision} />
            {result.message && (
              <div
                role="alert"
                className="space-y-2 rounded-lg border border-status-danger-border p-3 text-sm text-status-danger-text"
              >
                <p>{result.message}</p>
                {result.existingId && (
                  <Link
                    href={`${adminPaths.admissions}/${result.existingId}`}
                    className="inline-flex min-h-11 items-center text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    {copy.viewExisting}
                  </Link>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(({ name, label, type, required, maxLength, options }) => {
                const error = result.fieldErrors?.[name]?.[0];
                const props = {
                  id: name,
                  name,
                  className: fieldClass,
                  value: values[name] ?? "",
                  required,
                  "aria-invalid": Boolean(error),
                  "aria-describedby": error ? `${name}-error` : undefined,
                  onChange: (
                    event: React.ChangeEvent<
                      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                    >
                  ) => {
                    const value = event.currentTarget.value;
                    setValues((previous) => ({ ...previous, [name]: value }));
                  },
                };
                return (
                  <div
                    key={name}
                    className={type === "textarea" ? "space-y-1 sm:col-span-2" : "space-y-1"}
                  >
                    <label htmlFor={name} className="block text-sm font-medium">
                      {label}
                    </label>
                    {type === "textarea" ? (
                      <textarea {...props} maxLength={maxLength} rows={3} />
                    ) : type === "select" ? (
                      <select {...props}>
                        <option value="">{copy.chooseOption}</option>
                        {options?.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input {...props} type={type} maxLength={maxLength} />
                    )}
                    {error && (
                      <p id={`${name}-error`} className="text-sm text-status-danger-text">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <Button type="submit" isLoading={pending} className="min-h-11">
              {pending ? copy.saving : selected.isFree ? copy.save : copy.saveForReview}
            </Button>
          </section>
        )}
      </fieldset>
    </form>
  );
}
