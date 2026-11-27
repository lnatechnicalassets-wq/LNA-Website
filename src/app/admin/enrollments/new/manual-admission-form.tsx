"use client";

import React, { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  manualAdmissionCopy as copy,
  manualAnswerField,
  manualStudentFields,
  type ExistingStudentLookup,
  type ManualAdmissionBatchOption,
  type ManualAdmissionState,
} from "@/lib/admin-manual-admission";
import { formatPoishaToBDT } from "@/lib/money";
import { StaffPaymentFields } from "./staff-payment-fields";
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
  lookup,
}: {
  batches: ManualAdmissionBatchOption[];
  initialBatchId?: string;
  save: (state: ManualAdmissionState, formData: FormData) => Promise<ManualAdmissionState>;
  lookup?: (input: {
    email: string;
    phone: string;
    courseId: string;
  }) => Promise<ExistingStudentLookup>;
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
  const [lookupResult, setLookupResult] = useState<ExistingStudentLookup>({});
  const [lookupPending, setLookupPending] = useState(false);
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

  if (result.success) {
    const success = result.success;
    return (
      <section className={cardClass} aria-labelledby="admission-success">
        <h2 id="admission-success" className="text-xl font-semibold text-primary-900">
          Admission confirmed
        </h2>
        <p role="status">
          {success.reference} · Collection: {formatPoishaToBDT(success.collectedPoisha)}
        </p>
        <p className="text-sm text-text-secondary">
          Confirmation email:{" "}
          {success.email === "accepted"
            ? "Accepted by email provider"
            : success.email === "queued"
              ? "Queued or pending delivery"
              : "Not requested"}
        </p>
        <p className="text-sm text-text-secondary">
          Receipt PDF will be available when receipt generation is implemented.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setShowResult(false);
              setValues({});
              setLookupResult({});
            }}
          >
            Add Another Student
          </Button>
          <Link
            className="text-sm font-semibold underline"
            href={`${adminPaths.admissions}/${success.enrollmentId}`}
          >
            View Admission
          </Link>
          <Link
            className="text-sm font-semibold underline"
            href={adminEnrollmentsHref({ view: "students", batchId: selected?.id })}
          >
            View Students
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setShowResult(true);
        startTransition(() => action(data));
      }}
    >
      <fieldset
        disabled={pending || lookupPending}
        aria-busy={pending || lookupPending}
        className="space-y-4"
      >
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
                  setLookupResult({});
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
                  setLookupResult({});
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

        {selected && (
          <section className={cardClass} aria-labelledby="admission-details-heading">
            <h2 id="admission-details-heading" className="font-semibold text-primary-900">
              {copy.studentDetails}
            </h2>
            <input type="hidden" name="batchId" value={selected.id} />
            <input type="hidden" name="batchRevision" value={selected.revision} />
            {selected.questionVersion !== undefined && (
              <input type="hidden" name="questionVersion" value={selected.questionVersion} />
            )}
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
                    if (name === "email" || name === "phone") setLookupResult({});
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
            {lookup && (
              <div className="space-y-3 rounded-lg border border-border-subtle p-3">
                <Button
                  type="button"
                  variant="outline"
                  isLoading={lookupPending}
                  onClick={async () => {
                    setLookupPending(true);
                    setLookupResult({});
                    try {
                      setLookupResult(
                        await lookup({
                          email: values.email ?? "",
                          phone: values.phone ?? "",
                          courseId,
                        })
                      );
                    } catch {
                      setLookupResult({ message: "Student lookup is unavailable. Try again." });
                    } finally {
                      setLookupPending(false);
                    }
                  }}
                >
                  Find existing student
                </Button>
                <p className="text-xs text-text-secondary">
                  Enter both email and mobile number to find the exact student. Review the details
                  before using them.
                </p>
                {lookupResult.message && (
                  <p role="status" className="text-sm">
                    {lookupResult.message}
                  </p>
                )}
                {lookupResult.student && (
                  <div className="space-y-2 text-sm">
                    <p>
                      {lookupResult.student.fullName} · {lookupResult.student.email} ·{" "}
                      {lookupResult.student.phone}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const student = lookupResult.student;
                        if (!student) return;
                        const answers = Object.fromEntries(
                          selected.questions.flatMap((q) => {
                            const value = Object.hasOwn(student.answers, q.id)
                              ? student.answers[q.id]
                              : q.id === "university"
                                ? student.university
                                : undefined;
                            return typeof value === "string" &&
                              (q.type !== "select" || q.options?.includes(value))
                              ? [[manualAnswerField(q.id), value]]
                              : [];
                          })
                        );
                        setValues((previous) => ({
                          ...previous,
                          ...answers,
                          fullName: student.fullName,
                          email: student.email,
                          phone: student.phone,
                        }));
                        setLookupResult({
                          message: "Existing details filled. Review them before saving.",
                        });
                      }}
                    >
                      Use existing details
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        {selected && (
          <>
            <StaffPaymentFields key={selected.id} batch={selected} result={result} />
            <Button type="submit" isLoading={pending} className="min-h-11">
              {pending ? copy.saving : selected.isFree ? copy.save : copy.saveForReview}
            </Button>
          </>
        )}
      </fieldset>
    </form>
  );
}
