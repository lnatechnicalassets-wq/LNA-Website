"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { EnrollmentStatusBadge } from "@/components/admin/enrollment-status-badge";
import { Badge, Button, Input } from "@/components/ui";
import { peopleCopy as copy, type StudentCourseRow } from "@/lib/admin-people";
import { adminPaths } from "@/lib/admin-navigation";
import { loadHistoryBatches, loadHistoryCourses, saveCourseHistory } from "./actions";

type CourseOption = Awaited<ReturnType<typeof loadHistoryCourses>>[number];
type BatchOption = Awaited<ReturnType<typeof loadHistoryBatches>>[number];

export function StudentCourseHistory({
  studentId,
  courses,
  archived,
}: {
  studentId: string;
  courses: StudentCourseRow[];
  archived: boolean;
}) {
  const router = useRouter();
  const optionsId = useId();
  const [showOptions, setShowOptions] = useState(false);
  const [catalog, setCatalog] = useState<CourseOption[] | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [batches, setBatches] = useState<Record<string, BatchOption[]>>({});
  const [loadError, setLoadError] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();

  function openCatalog() {
    setShowOptions(!showOptions);
    if (showOptions || catalog) return;
    setLoadError(false);
    startLoad(async () => {
      try {
        setCatalog(await loadHistoryCourses());
      } catch {
        setLoadError(true);
      }
    });
  }

  function toggleCourse(courseId: string) {
    setExpanded(expanded === courseId ? null : courseId);
    setLoadError(false);
    if (expanded === courseId || batches[courseId]) return;
    startLoad(async () => {
      try {
        const options = await loadHistoryBatches(courseId);
        setBatches((current) => ({ ...current, [courseId]: options }));
      } catch {
        setLoadError(true);
      }
    });
  }

  function save(input: Parameters<typeof saveCourseHistory>[0]) {
    setMessage(null);
    startSave(async () => {
      try {
        const result = await saveCourseHistory(input);
        if (!result.success) {
          setMessage({ text: result.message ?? copy.courseSaveFailed, error: true });
          return;
        }
        if (input.operation === "add") {
          setAdded((current) => [...current, `${input.courseId}:${input.batchId ?? ""}`]);
        } else {
          setEditingDate(null);
        }
        setMessage({
          text: input.operation === "add" ? copy.courseAdded : copy.completionDateSaved,
        });
        router.refresh();
      } catch {
        setMessage({ text: copy.courseSaveFailed, error: true });
      }
    });
  }

  function batchRow(courseId: string, title: string, batchId: string | null, label: string) {
    const key = `${courseId}:${batchId ?? ""}`;
    const alreadyAdded = courses.some((course) => course.key === key) || added.includes(key);
    return (
      <li
        key={key}
        className="flex min-h-10 items-center justify-between gap-3 border-t border-border-subtle px-3 py-1"
      >
        <span className="break-words text-sm">{label}</span>
        {alreadyAdded ? (
          <Badge variant="success">
            <Check className="size-3" aria-hidden="true" />
            {copy.added}
          </Badge>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            className="size-9 shrink-0"
            disabled={saving}
            aria-label={copy.addCourseBatch(`${title}, ${label}`)}
            onClick={() => save({ operation: "add", id: studentId, courseId, batchId })}
          >
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-5">
      {[false, true].map((previous) => {
        const entries = courses.filter((entry) => entry.previous === previous);
        return (
          <section key={String(previous)} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-primary-900">
                {previous ? copy.previousCourses : copy.enrolledCourses}
              </h3>
              {previous && !archived && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-9"
                  disabled={loading && catalog === null}
                  aria-controls={optionsId}
                  aria-expanded={showOptions}
                  onClick={openCatalog}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  {copy.addPreviousCourse}
                </Button>
              )}
            </div>
            {entries.length === 0 && (
              <p className="rounded-lg bg-surface-subtle px-3 py-2.5 text-sm text-text-secondary">
                {previous ? copy.noPreviousCourses : copy.noEnrollments}
              </p>
            )}
            {entries.length > 0 && (
              <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
                {entries.map((entry) => (
                  <li key={entry.key} className="space-y-2 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        {entry.enrollmentId ? (
                          <Link
                            href={`${adminPaths.admissions}/${entry.enrollmentId}`}
                            className="inline-flex items-center gap-1 break-words text-sm font-semibold text-primary-800 hover:underline"
                          >
                            {entry.title}
                            <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
                          </Link>
                        ) : (
                          <p className="break-words text-sm font-semibold">{entry.title}</p>
                        )}
                        <p className="text-xs text-text-secondary">
                          {entry.batch ?? copy.batchUnknown}
                        </p>
                      </div>
                      {entry.completionId ? (
                        <Badge variant="success">{copy.completed}</Badge>
                      ) : previous ? (
                        <Badge variant="outline">{copy.pastEnrollment}</Badge>
                      ) : (
                        <EnrollmentStatusBadge status={entry.enrollmentStatus ?? "confirmed"} />
                      )}
                    </div>
                    {entry.completionId && (
                      <div className="flex flex-wrap items-center gap-x-3">
                        {entry.completionDate && (
                          <time
                            dateTime={entry.completionDate}
                            className="text-sm text-text-secondary"
                          >
                            {entry.completionDate}
                          </time>
                        )}
                        {!archived && editingDate !== entry.key && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDate(entry.key)}
                          >
                            {entry.completionDate
                              ? copy.editCompletionDate
                              : copy.addCompletionDate}
                          </Button>
                        )}
                      </div>
                    )}
                    {editingDate === entry.key && entry.completionId && !archived && (
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const value = new FormData(event.currentTarget).get("completed");
                          if (entry.completionId)
                            save({
                              operation: "date",
                              id: studentId,
                              completionId: entry.completionId,
                              date: typeof value === "string" && value ? value : null,
                            });
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <Input
                            type="date"
                            name="completed"
                            label={copy.completedOn}
                            defaultValue={entry.completionDate ?? ""}
                          />
                        </div>
                        <Button type="submit" disabled={saving}>
                          {copy.save}
                        </Button>
                        <Button variant="ghost" onClick={() => setEditingDate(null)}>
                          {copy.cancel}
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {showOptions && (
        <section
          id={optionsId}
          className="space-y-2 rounded-xl border border-border-subtle bg-surface-subtle p-3"
        >
          {loading && catalog === null && (
            <p role="status" className="text-sm">
              {copy.loadingCourses}
            </p>
          )}
          {catalog && (
            <>
              <Input
                type="search"
                label={copy.searchCourses}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
              <ul className="max-h-64 divide-y divide-border-subtle overflow-y-auto rounded-lg border border-border-subtle bg-surface-card">
                {catalog
                  .filter((course) =>
                    course.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
                  )
                  .map((course) => (
                    <li key={course.id}>
                      <button
                        type="button"
                        aria-expanded={expanded === course.id}
                        onClick={() => toggleCourse(course.id)}
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600"
                      >
                        {course.title}
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-4 shrink-0 ${expanded === course.id ? "rotate-180" : ""}`}
                        />
                      </button>
                      {expanded === course.id && (
                        <>
                          {loading && !batches[course.id] && (
                            <p role="status" className="px-3 py-2 text-sm">
                              {copy.loadingBatches}
                            </p>
                          )}
                          {batches[course.id] && (
                            <ul>
                              {batches[course.id].length === 0 && (
                                <li className="px-3 py-2 text-xs text-text-secondary">
                                  {copy.noPastBatches}
                                </li>
                              )}
                              {batches[course.id].map((batch) =>
                                batchRow(course.id, course.title, batch.id, batch.name)
                              )}
                              {batchRow(course.id, course.title, null, copy.batchUnknown)}
                            </ul>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                {!catalog.some((course) =>
                  course.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
                ) && <li className="p-3 text-sm text-text-secondary">{copy.noMatchingCourses}</li>}
              </ul>
            </>
          )}
          {loadError && (
            <p role="alert" className="text-sm text-status-danger-text">
              {copy.courseLoadFailed}
            </p>
          )}
        </section>
      )}
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`text-sm ${message.error ? "text-status-danger-text" : "text-status-success-text"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
