import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Search,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { PersonDialog } from "@/components/admin/person-dialog";
import { RecordAvatar, RecordsHeader, recordTabClass } from "@/components/admin/records-header";
import { Button } from "@/components/ui";
import { peopleCopy as copy, peopleQuery } from "@/lib/admin-people";
import { adminPaths } from "@/lib/admin-navigation";
import { listStaffStudents, requireDirectoryStaff } from "@/server/admin/people";
import { saveStudent } from "./actions";
import { StudentFields } from "./student-fields";
import { StudentRecordActions } from "./student-record-actions";

type Student = Awaited<ReturnType<typeof listStaffStudents>>["items"][number];

const studentColumns = "@3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.25fr)_20rem]";
const pageLink =
  "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 font-medium text-primary-900 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

function directoryHref(archived: boolean, search: string, page = 1) {
  const params = new URLSearchParams();
  if (archived) params.set("archived", "1");
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  return params.size ? `${adminPaths.studentDirectory}?${params}` : adminPaths.studentDirectory;
}

function StudentDetails({ student }: { student: Student }) {
  const contact = [
    { label: copy.email, value: student.email },
    { label: copy.phone, value: student.phone },
    { label: copy.university, value: student.university || copy.missing },
  ];
  return (
    <>
      <dl className="grid gap-3 rounded-xl bg-surface-subtle p-4 text-sm sm:grid-cols-2">
        {contact.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium text-text-secondary">{label}</dt>
            <dd className="break-words font-medium text-primary-900">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export const dynamic = "force-dynamic";

export default async function StudentsDirectory({
  searchParams,
}: {
  searchParams: Promise<Record<string, unknown>>;
}) {
  const staff = await requireDirectoryStaff("enrollments:manage");
  const filters = peopleQuery.parse(await searchParams);
  const isArchived = Boolean(filters.archived);
  const { items, hasNext, totalCount } = await listStaffStudents(filters);
  if (items.length === 0 && filters.page > 1) {
    redirect(directoryHref(isArchived, filters.q, Math.max(1, Math.ceil(totalCount / 18))));
  }

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.studentDirectory}>
      <section className="@container mx-auto w-full max-w-7xl space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        <RecordsHeader
          icon={GraduationCap}
          title={copy.students}
          description={copy.studentDescription}
          action={
            <PersonDialog
              title={copy.addStudent}
              description={copy.studentDescription}
              action={saveStudent}
              label={copy.addStudent}
              target={{ operation: "create" }}
              trigger={{
                variant: "ghost",
                className: "bg-surface-card hover:bg-primary-50 focus-visible:outline-primary-200",
                children: (
                  <>
                    <UserRoundPlus aria-hidden="true" className="size-4" />
                    {copy.addStudent}
                  </>
                ),
              }}
            >
              <StudentFields />
            </PersonDialog>
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-x-6 border-b border-border-default px-0.5">
          <nav aria-label={copy.students} className="flex gap-x-4 sm:gap-x-6">
            <Link
              href={directoryHref(false, filters.q)}
              aria-current={!isArchived ? "page" : undefined}
              className={recordTabClass}
            >
              <UsersRound aria-hidden="true" className="size-4" />
              {copy.active}
            </Link>
            <Link
              href={directoryHref(true, filters.q)}
              aria-current={isArchived ? "page" : undefined}
              className={recordTabClass}
            >
              <Archive aria-hidden="true" className="size-4" />
              {copy.archived}
            </Link>
          </nav>
          <p
            aria-live="polite"
            className="py-2 text-xs font-medium tabular-nums text-text-secondary sm:text-sm"
          >
            {copy.studentCount(totalCount)}
          </p>
        </div>
        <form
          key={`${filters.q}:${isArchived}`}
          action={adminPaths.studentDirectory}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface-card p-3 shadow-xs"
        >
          {isArchived && <input type="hidden" name="archived" value="1" />}
          <div className="relative min-w-0 flex-1">
            <label htmlFor="student-search" className="sr-only">
              {copy.searchStudents}
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            />
            <input
              id="student-search"
              name="q"
              type="search"
              defaultValue={filters.q}
              maxLength={80}
              placeholder={copy.studentSearchPlaceholder}
              className="min-h-11 w-full rounded-lg border border-border-default bg-surface-base py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            />
          </div>
          <Button type="submit" variant="secondary" className="min-h-11">
            {copy.search}
          </Button>
          {filters.q && (
            <Link
              href={directoryHref(isArchived, "")}
              className={`${pageLink} max-sm:w-full max-sm:justify-center`}
            >
              {copy.clearSearch}
            </Link>
          )}
        </form>

        {items.length ? (
          <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-xs">
            <div
              aria-hidden="true"
              className={`hidden gap-4 border-b border-border-default bg-primary-50 px-4 py-3 text-xs font-semibold text-primary-700 @3xl:grid ${studentColumns}`}
            >
              <span>{copy.studentColumn}</span>
              <span>{copy.contactColumn}</span>
              <span>{copy.history}</span>
              <span className="text-right">{copy.actions}</span>
            </div>
            <ul aria-label={copy.students} className="divide-y divide-border-subtle">
              {items.map((student) => {
                const [course] = student.courses;
                return (
                  <li
                    key={student.id}
                    className={`grid grid-cols-2 items-start gap-3 px-4 py-4 text-sm hover:bg-surface-subtle/60 @3xl:items-center @3xl:gap-4 ${studentColumns}`}
                  >
                    <div className="col-span-2 flex min-w-0 items-center gap-2.5 @3xl:col-span-1">
                      <RecordAvatar name={student.full_name} />
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold text-primary-900">
                          {student.full_name}
                        </h2>
                        <p className="break-words text-xs text-text-secondary">{student.email}</p>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-semibold text-text-secondary @3xl:hidden">
                        {copy.contactColumn}
                      </p>
                      <p className="font-medium tabular-nums text-primary-900">{student.phone}</p>
                      <p className="break-words text-xs text-text-secondary">
                        {student.university || copy.missing}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-semibold text-text-secondary @3xl:hidden">
                        {copy.history}
                      </p>
                      {course ? (
                        <>
                          <p className="break-words font-medium text-primary-900">{course.title}</p>
                          {course.batch && (
                            <p className="break-words text-xs text-text-secondary">
                              {course.batch}
                            </p>
                          )}
                          {student.courses.length > 1 && (
                            <span className="text-xs font-semibold text-primary-800">
                              {copy.moreCourses(student.courses.length - 1)}
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-text-secondary">{copy.noCourses}</p>
                      )}
                    </div>
                    <div className="col-span-2 border-t border-border-subtle pt-2 @3xl:col-span-1 @3xl:border-0 @3xl:pt-0">
                      <StudentRecordActions
                        student={{
                          id: student.id,
                          name: student.full_name,
                          email: student.email,
                          revision: student.updated_at,
                          archived: Boolean(student.archived_at),
                        }}
                        courses={student.courses}
                        details={<StudentDetails student={student} />}
                        fields={
                          student.archived_at ? undefined : <StudentFields profile={student} />
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="grid justify-items-center gap-2 rounded-2xl border border-border-default bg-surface-card px-4 py-10 text-center">
            <UsersRound aria-hidden="true" className="size-6 text-primary-800" />
            <h2 className="font-semibold text-primary-900">{copy.noStudentsTitle}</h2>
            <p className="text-sm text-text-secondary">
              {filters.q
                ? copy.noMatchingStudents
                : isArchived
                  ? copy.noArchivedStudents
                  : copy.noStudentsHelp}
            </p>
          </div>
        )}
        {(filters.page > 1 || hasNext) && (
          <nav
            aria-label={copy.page}
            className="flex flex-wrap items-center justify-end gap-2 text-sm text-text-secondary"
          >
            {filters.page > 1 && (
              <Link
                href={directoryHref(isArchived, filters.q, filters.page - 1)}
                className={pageLink}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                {copy.previous}
              </Link>
            )}
            <span className="px-2">
              {copy.page} {filters.page}
            </span>
            {hasNext && (
              <Link
                href={directoryHref(isArchived, filters.q, filters.page + 1)}
                className={pageLink}
              >
                {copy.next}
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </nav>
        )}
      </section>
    </AdminPortalShell>
  );
}
