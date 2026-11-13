"use client";

import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import type { CatalogSection } from "@/lib/admin-catalog";
import {
  batchCreateSchema,
  batchEditSchema,
  courseCreateSchema,
  courseEditSchema,
  createCatalogCopy,
  createFields,
  editCatalogCopy,
  editFields,
  type CatalogEditState,
} from "@/lib/admin-catalog-edit";

const inputClassName =
  "min-h-11 w-full rounded-lg border bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

const formSchemas = {
  create: { courses: courseCreateSchema, batches: batchCreateSchema },
  edit: { courses: courseEditSchema, batches: batchEditSchema },
};

const dependentFields: Record<string, string | undefined> = {
  start_date: "end_date",
  fee_poisha: "discount_fee_poisha",
};

export function EditForm({
  section,
  initialValues,
  save,
  mode = "edit",
  courseOptions = [],
}: {
  section: CatalogSection;
  initialValues: Record<string, string>;
  mode?: "edit" | "create";
  courseOptions?: { id: string; title: string; slug: string }[];
  save: (previous: CatalogEditState, formData: FormData) => Promise<CatalogEditState>;
}) {
  const [state, action, pending] = useActionState(save, {});
  const [values, setValues] = useState(initialValues);
  const [localErrors, setLocalErrors] = useState<Record<string, string | undefined>>({});
  const [attempted, setAttempted] = useState(false);
  const [submittedValues, setSubmittedValues] = useState(initialValues);
  const fields = mode === "create" ? createFields[section] : editFields[section];
  const copy = mode === "create" ? createCatalogCopy : editCatalogCopy;

  const serverErrors = Object.fromEntries(
    Object.entries(state.fieldErrors ?? {}).filter(
      ([name]) =>
        (values[name] ?? "") === (submittedValues[name] ?? "") &&
        (name !== "batch_number" || values.course_id === submittedValues.course_id)
    )
  );
  const serverMessage = state.fieldErrors
    ? Object.values(serverErrors).some((errors) => errors?.length)
      ? state.message
      : undefined
    : state.message;
  const message =
    attempted && Object.values(localErrors).some(Boolean) ? editCatalogCopy.invalid : serverMessage;

  function validate(input: Record<string, string>) {
    const result = formSchemas[mode][section].safeParse(input);
    const errors: Record<string, string[] | undefined> = result.success
      ? {}
      : result.error.flatten().fieldErrors;
    return Object.fromEntries(fields.map(({ name }) => [name, errors[name]?.[0]]));
  }

  function handleBlur(name: string, value: string) {
    const input = Object.fromEntries(fields.map((field) => [field.name, values[field.name] ?? ""]));
    input[name] = value;
    const errors = validate(input);
    const dependent = dependentFields[name];

    setLocalErrors((current) => {
      const next = { ...current, [name]: errors[name] };
      if (dependent && (input[dependent] || dependent in current)) {
        next[dependent] = errors[dependent];
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const input = Object.fromEntries(
      fields.map(({ name }) => [name, String(formData.get(name) ?? "")])
    );
    const errors = validate(input);
    setAttempted(true);
    setLocalErrors(errors);
    const firstInvalid = fields.find(({ name }) => errors[name]);
    if (firstInvalid) {
      event.preventDefault();
      const field = event.currentTarget.elements.namedItem(firstInvalid.name);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setSubmittedValues(input);
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      {message && (
        <p role="alert" className="text-sm text-status-danger-text">
          {message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const { name, label, type } = field;
          const hint = "hint" in field ? field.hint : undefined;
          const error = localErrors[name] ?? serverErrors[name]?.[0];
          const props = {
            id: name,
            name,
            value: values[name] ?? "",
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
            ) => {
              const value = event.currentTarget.value;
              setValues((current) => ({ ...current, [name]: value }));
            },
            onBlur: (
              event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
            ) => handleBlur(name, event.currentTarget.value),
            className: `${inputClassName} ${error ? "border-status-danger-border" : "border-border-default"}`,
            "aria-required": name !== "discount_fee_poisha",
            "aria-invalid": Boolean(error),
            "aria-describedby":
              [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") ||
              undefined,
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
                <textarea {...props} rows={4} />
              ) : type === "select" ? (
                <select {...props}>
                  <option value="">{createCatalogCopy.chooseCourse}</option>
                  {courseOptions.map(({ id, title, slug }) => (
                    <option key={id} value={id}>
                      {title} ({slug})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...props}
                  type={type === "date" ? "date" : "text"}
                  inputMode={
                    type === "money" ? "decimal" : type === "integer" ? "numeric" : undefined
                  }
                />
              )}
              {hint && (
                <p id={`${name}-hint`} className="text-sm text-text-secondary">
                  {hint}
                </p>
              )}
              <p
                id={`${name}-error`}
                aria-live="polite"
                className="text-sm text-status-danger-text empty:absolute"
              >
                {error}
              </p>
            </div>
          );
        })}
      </div>
      <Button type="submit" className="min-h-11" disabled={pending || state.reloadRequired}>
        {pending ? copy.saving : copy.save}
      </Button>
    </form>
  );
}
