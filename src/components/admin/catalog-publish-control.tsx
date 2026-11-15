"use client";

import React, { useActionState } from "react";
import { Badge, Button } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { catalogStatusLabels, type CatalogSection } from "@/lib/admin-catalog";
import { catalogPublishCopy } from "@/lib/admin-catalog-publish";

type PublishState = { message?: string; reloadRequired?: boolean };

export function CatalogPublishControl({
  section,
  publish,
}: {
  section: CatalogSection;
  publish: (previous: PublishState, formData: FormData) => Promise<PublishState>;
}) {
  const [state, action, pending] = useActionState(publish, {});
  const copy = catalogPublishCopy[section];

  return (
    <section className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-primary-900">{catalogPublishCopy.heading}</h2>
        <Badge variant="outline">{catalogStatusLabels.draft}</Badge>
      </div>
      <p className="text-sm text-text-secondary">{catalogPublishCopy.savedVersion}</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="min-h-11" disabled={pending}>
            {copy.action}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.action}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-3">
            {state.message && (
              <p role="alert" className="text-sm text-status-danger-text">
                {state.message}
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="min-h-11">
                  {catalogPublishCopy.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" className="min-h-11" disabled={pending || state.reloadRequired}>
                {pending ? catalogPublishCopy.publishing : copy.action}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
