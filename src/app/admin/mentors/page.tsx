import React from "react";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { MentorProfileCard } from "@/components/admin/mentor-profile-card";
import { PeopleDirectoryShell } from "@/components/admin/people-directory-shell";
import { MentorQuickViewDetails } from "@/components/home/mentor-quick-view-modal";
import { mentorPreviewProvenance, publicMentorSource } from "@/lib/mentor-profile";
import { Badge } from "@/components/ui";
import { PersonDialog } from "@/components/admin/person-dialog";
import { peopleCopy as copy, peopleQuery } from "@/lib/admin-people";
import { adminPaths } from "@/lib/admin-navigation";
import { listMentorAssets, listStaffMentors, requireDirectoryStaff } from "@/server/admin/people";
import { saveMentor } from "./actions";

import { MentorFields } from "./mentor-fields";

export const dynamic = "force-dynamic";

export default async function MentorsDirectory({
  searchParams,
}: {
  searchParams: Promise<Record<string, unknown>>;
}) {
  const staff = await requireDirectoryStaff("catalog:edit");
  const filters = peopleQuery.parse(await searchParams);
  const [{ items, hasNext }, assets] = await Promise.all([
    listStaffMentors(filters),
    listMentorAssets(),
  ]);
  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.mentors}>
      <PeopleDirectoryShell
        title={copy.mentors}
        description={copy.mentorDescription}
        searchLabel={copy.searchMentors}
        path={adminPaths.mentors}
        filters={filters}
        next={hasNext}
        add={
          <PersonDialog
            title={copy.addMentor}
            description={copy.mentorDescription}
            label={copy.addMentor}
            primary
            editor
            action={saveMentor}
            target={{ operation: "create" }}
          >
            <MentorFields assets={assets} />
          </PersonDialog>
        }
      >
        {items.length ? (
          <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((mentor) => (
              <li
                key={mentor.id}
                className="min-w-0 space-y-2 rounded-xl border border-border-subtle border-t-2 border-t-primary-500 bg-surface-card p-3 shadow-xs"
              >
                <MentorProfileCard mentor={mentor}>
                  {!mentor.archived_at && (
                    <Badge variant={mentor.published ? "success" : "outline"}>
                      {mentor.published ? copy.mentorPublished : copy.mentorDraft}
                    </Badge>
                  )}
                </MentorProfileCard>
                <div className="flex flex-wrap gap-2">
                  <PersonDialog
                    title={`${copy.mentorDetails} · ${mentor.name}`}
                    description={mentor.organization}
                    label={copy.view}
                  >
                    <MentorQuickViewDetails
                      mentor={{
                        ...publicMentorSource(mentor),
                        order: 0,
                        isPlaceholder: false,
                        provenance: mentorPreviewProvenance,
                      }}
                    />
                  </PersonDialog>
                  {!mentor.archived_at && (
                    <PersonDialog
                      key={`edit-${mentor.updated_at}`}
                      title={`${copy.edit} ${mentor.name}`}
                      description={copy.mentorDescription}
                      label={copy.edit}
                      action={saveMentor}
                      editor
                      target={{ operation: "edit", id: mentor.id, revision: mentor.updated_at }}
                    >
                      <MentorFields mentor={mentor} assets={assets} />
                    </PersonDialog>
                  )}
                  <PersonDialog
                    key={`archive-${mentor.updated_at}`}
                    title={`${mentor.archived_at ? copy.restore : copy.archive} ${mentor.name}`}
                    description={
                      mentor.archived_at ? copy.restoreDescription : copy.archivedDescription
                    }
                    label={mentor.archived_at ? copy.restore : copy.archive}
                    action={saveMentor}
                    target={{
                      operation: mentor.archived_at ? "restore" : "archive",
                      id: mentor.id,
                      revision: mentor.updated_at,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border-subtle bg-surface-card p-4 text-sm text-text-secondary">
            {copy.noMentors}
          </p>
        )}
      </PeopleDirectoryShell>
    </AdminPortalShell>
  );
}
