"use client";

import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import {
  courseContentSchema,
  splitContentLines,
  type CourseContent,
  type CourseContentState,
} from "@/lib/course-content";

const inputClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
const listFields = [
  ["learning_outcomes", "Learning outcomes"],
  ["target_audience", "Who should attend"],
  ["prerequisites", "Prerequisites"],
] as const;

type ModuleInput = { id: string; title: string; duration: string; topicsText: string };

export function CourseContentForm({
  initial,
  save,
}: {
  initial: CourseContent;
  save: (previous: CourseContentState, data: FormData) => Promise<CourseContentState>;
}) {
  const [state, action, pending] = useActionState(save, {});
  const [lists, setLists] = useState(() => ({
    learning_outcomes: initial.learning_outcomes.join("\n"),
    target_audience: initial.target_audience.join("\n"),
    prerequisites: initial.prerequisites.join("\n"),
  }));
  const [modules, setModules] = useState<ModuleInput[]>(() =>
    initial.modules.map((module) => ({
      id: module.id,
      title: module.title,
      duration: module.duration,
      topicsText: module.topics.join("\n"),
    }))
  );
  const [featured, setFeatured] = useState(initial.featured);
  const [validation, setValidation] = useState("");
  const content: CourseContent = {
    learning_outcomes: splitContentLines(lists.learning_outcomes),
    target_audience: splitContentLines(lists.target_audience),
    prerequisites: splitContentLines(lists.prerequisites),
    modules: modules.map(({ id, title, duration, topicsText }) => ({
      id,
      title,
      duration,
      topics: splitContentLines(topicsText),
    })),
    featured,
  };
  const locked = pending || Boolean(state.stale);

  function editModule(id: string, change: Partial<ModuleInput>) {
    setModules((current) =>
      current.map((module) => (module.id === id ? { ...module, ...change } : module))
    );
  }

  return (
    <form
      action={action}
      className="space-y-5"
      onSubmit={(event) => {
        const parsed = courseContentSchema.safeParse(content);
        if (!parsed.success) {
          event.preventDefault();
          setValidation(
            `Check ${parsed.error.issues[0]?.path.join(" / ") || "the course content"}: ${parsed.error.issues[0]?.message || "Invalid value"}`
          );
        } else setValidation("");
      }}
    >
      <input type="hidden" name="content" value={JSON.stringify(content)} />
      {(validation || state.message) && (
        <p role="alert" className="text-sm text-status-danger-text">
          {validation || state.message}
        </p>
      )}
      <fieldset disabled={locked} className="space-y-5">
        {listFields.map(([name, label]) => (
          <label key={name} className="block space-y-1 text-sm font-medium">
            <span>{label}</span>
            <textarea
              className={inputClass}
              rows={4}
              value={lists[name]}
              onChange={(event) =>
                setLists((current) => ({ ...current, [name]: event.target.value }))
              }
              placeholder="Enter one item per line"
              maxLength={15000}
            />
          </label>
        ))}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-primary-900">Course modules</h3>
            <Button
              type="button"
              variant="outline"
              disabled={modules.length >= 30}
              onClick={() =>
                setModules((current) => [
                  ...current,
                  { id: crypto.randomUUID(), title: "", duration: "", topicsText: "" },
                ])
              }
            >
              Add module
            </Button>
          </div>
          {modules.length === 0 && (
            <p className="text-sm text-text-secondary">No modules have been added.</p>
          )}
          {modules.map((module, index) => (
            <div
              key={module.id}
              className="space-y-3 rounded-lg border border-border-subtle p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium">Module {index + 1}</h4>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setModules((current) => current.filter((item) => item.id !== module.id))
                  }
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  <span>Title</span>
                  <input
                    className={inputClass}
                    value={module.title}
                    onChange={(event) => editModule(module.id, { title: event.target.value })}
                    required
                    minLength={3}
                    maxLength={160}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Duration</span>
                  <input
                    className={inputClass}
                    value={module.duration}
                    onChange={(event) => editModule(module.id, { duration: event.target.value })}
                    required
                    maxLength={100}
                    placeholder="e.g. 2 hours"
                  />
                </label>
              </div>
              <label className="block space-y-1 text-sm font-medium">
                <span>Topics</span>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={module.topicsText}
                  onChange={(event) => editModule(module.id, { topicsText: event.target.value })}
                  placeholder="Enter one topic per line"
                  maxLength={15000}
                />
              </label>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
            className="size-4"
          />
          Feature this course
        </label>
        <Button type="submit" disabled={locked}>
          {pending ? "Saving…" : "Save course content"}
        </Button>
      </fieldset>
    </form>
  );
}
