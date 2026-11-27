"use client";

import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import type { ProgramQuestion } from "@/lib/enrollment/types";

const inputClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary-600";
const smallButton =
  "min-h-11 rounded-lg border border-border-default px-3 text-sm font-medium text-primary-900 disabled:opacity-50";

export function CourseQuestionsForm({
  initial,
  save,
}: {
  initial: ProgramQuestion[];
  save: (previous: { message?: string }, form: FormData) => Promise<{ message?: string }>;
}) {
  const [questions, setQuestions] = useState(initial);
  const [state, action, pending] = useActionState(save, {});
  const update = (index: number, transform: (question: ProgramQuestion) => ProgramQuestion) => {
    setQuestions((previous) =>
      previous.map((question, i) => (i === index ? transform(question) : question))
    );
  };
  const move = (index: number, direction: -1 | 1) => {
    setQuestions((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const add = () =>
    setQuestions((previous) => {
      if (previous.length >= 20) return previous;
      return [
        ...previous,
        {
          id: `q_${crypto.randomUUID().replace(/-/g, "")}`,
          label: "",
          type: "text",
          required: false,
        },
      ];
    });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
      <fieldset disabled={pending} className="space-y-4">
        {questions.length === 0 && (
          <p className="text-sm text-text-secondary">No extra application questions.</p>
        )}
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-3 rounded-lg border border-border-default p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-primary-900">Question {index + 1}</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={smallButton}
                  disabled={index === 0}
                  aria-label={`Move question ${index + 1} up`}
                  onClick={() => move(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className={smallButton}
                  disabled={index === questions.length - 1}
                  aria-label={`Move question ${index + 1} down`}
                  onClick={() => move(index, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className={smallButton}
                  aria-label={`Remove question ${index + 1}`}
                  onClick={() => setQuestions((previous) => previous.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            </div>
            <label className="block space-y-1 text-sm">
              Question label
              <input
                className={inputClass}
                required
                maxLength={160}
                value={question.label}
                onChange={(event) => update(index, (q) => ({ ...q, label: event.target.value }))}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                Answer type
                <select
                  className={inputClass}
                  value={question.type}
                  onChange={(event) => {
                    const type = event.target.value as ProgramQuestion["type"];
                    update(index, (q) => ({
                      ...q,
                      type,
                      options: type === "select" ? (q.options ?? ["", ""]) : undefined,
                    }));
                  }}
                >
                  <option value="text">Short text</option>
                  <option value="textarea">Long text</option>
                  <option value="select">Dropdown</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                Placeholder (optional)
                <input
                  className={inputClass}
                  maxLength={200}
                  value={question.placeholder ?? ""}
                  onChange={(event) =>
                    update(index, (q) => ({ ...q, placeholder: event.target.value }))
                  }
                />
              </label>
            </div>
            {question.type === "select" && (
              <label className="block space-y-1 text-sm">
                Options (one per line)
                <textarea
                  className={inputClass}
                  rows={4}
                  maxLength={5000}
                  value={(question.options ?? []).join("\n")}
                  onChange={(event) =>
                    update(index, (q) => ({ ...q, options: event.target.value.split("\n") }))
                  }
                />
              </label>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(event) =>
                  update(index, (q) => ({ ...q, required: event.target.checked }))
                }
              />
              Required answer
            </label>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={smallButton}
            disabled={questions.length >= 20}
            onClick={add}
          >
            Add question
          </button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save application questions"}
          </Button>
        </div>
      </fieldset>
      {state.message && (
        <p role="alert" className="text-sm text-status-danger-text">
          {state.message}
        </p>
      )}
    </form>
  );
}
