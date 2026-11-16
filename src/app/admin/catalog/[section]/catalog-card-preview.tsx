"use client";

import React from "react";
import { Badge, Button } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { catalogPreviewCopy as copy, type CatalogPreview } from "@/lib/admin-catalog";

export function CatalogCardPreview({ preview }: { preview: CatalogPreview }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          aria-label={`${copy[preview.kind]} · ${preview.title}`}
        >
          {copy[preview.kind]}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogTitle>{preview.title}</DialogTitle>
        <DialogDescription>{preview.subtitle}</DialogDescription>
        <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <Badge variant={preview.statusVariant}>{preview.status}</Badge>
          {preview.summary && (
            <p className="break-words text-sm font-medium text-primary-900">{preview.summary}</p>
          )}
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {preview.fields.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-text-secondary">{label}</dt>
                <dd className="break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {preview.details && (
            <p className="whitespace-pre-line break-words text-sm text-text-secondary">
              {preview.details}
            </p>
          )}
        </div>
        <DialogClose asChild>
          <Button type="button" variant="outline" className="min-h-11 justify-self-end">
            {copy.close}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
