"use client";

import { useRef, useState, type ReactNode } from "react";
import { Archive, BookOpen, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { PersonDialogContent } from "@/components/admin/person-dialog";
import { RecordPurgeImpact, usePurgeImpact } from "@/components/admin/purge-impact";
import { Button, Input } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { peopleCopy as copy, type StudentCourseRow } from "@/lib/admin-people";
import { deleteStudent, saveStudent } from "./actions";
import { StudentCourseHistory } from "./student-course-history";

type Operation = "view" | "courses" | "edit" | "archive" | "restore" | "delete";

export function StudentRecordActions({
  student,
  courses,
  details,
  fields,
  allowPurge = true,
}: {
  student: { id: string; name: string; email: string; revision: string; archived: boolean };
  courses: StudentCourseRow[];
  details: ReactNode;
  fields: ReactNode;
  allowPurge?: boolean;
}) {
  const [open, setOpen] = useState<Operation | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const operation = useRef<Operation | null>(null);
  const { id, name, email, revision, archived } = student;
  const { impact, resetImpact } = usePurgeImpact("student", id, open === "delete");
  const actions = [
    { key: "view", label: copy.view, icon: Eye },
    ...(!archived ? [{ key: "edit", label: copy.edit, icon: Pencil } as const] : []),
    { key: "courses", label: copy.courses, icon: BookOpen },
    archived
      ? ({ key: "restore", label: copy.restore, icon: RotateCcw } as const)
      : ({ key: "archive", label: copy.archive, icon: Archive } as const),
  ] as const;

  function switchTo(next: Operation | null) {
    if (next === "delete") resetImpact();
    operation.current = next;
    setOpen(next);
  }

  function returnFocus(event: Event) {
    event.preventDefault();
    if (operation.current === null && trigger.current?.isConnected) trigger.current.focus();
  }

  return (
    <div className="grid w-full grid-cols-2 justify-end gap-1.5 min-[420px]:flex min-[420px]:flex-wrap">
      <Dialog open={open !== null} onOpenChange={(next) => !next && switchTo(null)}>
        {actions.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={key === "courses" ? "secondary" : "outline"}
            size="sm"
            className="min-h-9 px-2"
            aria-haspopup="dialog"
            aria-label={`${label} ${name}`}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              switchTo(key);
            }}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </Button>
        ))}
        {open === "view" && (
          <PersonDialogContent
            title={name}
            description={copy.studentDetails}
            onCloseAutoFocus={returnFocus}
          >
            {details}
            {allowPurge && (
              <div className="border-t border-border-subtle pt-3">
                <Button
                  variant="ghost"
                  className="text-status-danger-text hover:bg-status-danger-bg"
                  onClick={() => switchTo("delete")}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {copy.deleteStudent}
                </Button>
              </div>
            )}
          </PersonDialogContent>
        )}
        {open === "courses" && (
          <PersonDialogContent
            wide
            title={copy.studentCoursesLabel(name)}
            description={copy.history}
            onCloseAutoFocus={returnFocus}
          >
            <StudentCourseHistory studentId={id} courses={courses} archived={archived} />
          </PersonDialogContent>
        )}
        {open === "delete" && allowPurge && (
          <PersonDialogContent
            title={copy.deleteStudentTitle(name)}
            description={copy.studentDangerDescription}
            action={impact?.status === "eligible" ? deleteStudent : undefined}
            target={{ operation: "delete", id, revision }}
            onCloseAutoFocus={returnFocus}
          >
            <RecordPurgeImpact impact={impact} />
            {impact?.status === "eligible" && (
              <>
                <input type="hidden" name="impactToken" value={impact.token} />
                <Input
                  type="email"
                  name="confirmation"
                  autoComplete="off"
                  required
                  label={copy.deleteStudentConfirmation(email)}
                />
              </>
            )}
          </PersonDialogContent>
        )}
        {(open === "archive" || open === "restore" || open === "edit") && (
          <PersonDialogContent
            title={`${copy[open]} ${name}`}
            description={
              open === "archive"
                ? copy.archivedDescription
                : open === "restore"
                  ? copy.restoreDescription
                  : copy.studentContactDescription
            }
            action={saveStudent}
            target={{ operation: open, id, revision }}
            onCloseAutoFocus={returnFocus}
          >
            {open === "edit" ? fields : null}
          </PersonDialogContent>
        )}
      </Dialog>
    </div>
  );
}
