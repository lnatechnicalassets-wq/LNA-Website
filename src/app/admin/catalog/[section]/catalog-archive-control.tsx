"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { catalogArchiveCopy as copy, type CatalogSection } from "@/lib/admin-catalog";
import { archiveCatalogRecord } from "./catalog-archive-action";

export function CatalogArchiveControl({
  id,
  section,
  title,
  revision,
  archived,
}: {
  id: string;
  section: CatalogSection;
  title: string;
  revision: string;
  archived: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState(
    archiveCatalogRecord.bind(null, { id, section, restore: archived, revision }),
    {}
  );
  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);
  const label = archived ? copy.restore : copy.archive;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          aria-label={`${label} ${title}`}
        >
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {label} {title}
        </DialogTitle>
        <DialogDescription>{archived ? copy.restored : copy.hidden}</DialogDescription>
        <form action={action} className="space-y-3">
          {state.message && (
            <p role="alert" className="text-sm text-status-danger-text">
              {state.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              className="min-h-11"
              variant={archived ? "primary" : "danger"}
              isLoading={pending}
            >
              {label}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="min-h-11">
                {copy.cancel}
              </Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
