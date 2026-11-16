"use client";

import React, { startTransition, useActionState, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  peopleCopy as copy,
  type PeopleAction,
  type PersonTarget,
  type StudentDeleteTarget,
} from "@/lib/admin-people";

type DialogTarget = PersonTarget | StudentDeleteTarget;

function PersonForm<Target extends DialogTarget>({
  action,
  target,
  editor,
  children,
}: {
  action: PeopleAction<Target>;
  target: Target;
  editor?: boolean;
  children?: React.ReactNode;
}) {
  const [state, submit, pending] = useActionState(action.bind(null, target), {});
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);
  const deleting = target.operation === "delete";
  const submitLabel =
    target.operation === "archive" || target.operation === "restore"
      ? copy[target.operation]
      : deleting
        ? copy.deleteStudent
        : copy.save;

  return state.success ? (
    <div className={editor ? "space-y-4 px-4 py-5 sm:px-6" : "space-y-4"}>
      <p
        role="status"
        className="rounded-lg bg-status-success-bg p-3 text-sm font-medium text-status-success-text"
      >
        {deleting ? copy.studentDeleted : copy.saved}
      </p>
      <DialogClose asChild>
        <Button type="button" variant="outline">
          {copy.close}
        </Button>
      </DialogClose>
    </div>
  ) : (
    <form
      className={editor ? "grid min-h-0" : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => submit(data));
      }}
    >
      <fieldset
        disabled={pending}
        className={editor ? "grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto]" : "space-y-4"}
      >
        <div className={editor ? "overflow-y-auto px-4 py-5 sm:px-6" : undefined}>{children}</div>
        <div
          className={
            editor
              ? "flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle bg-surface-card px-4 py-3 sm:px-6"
              : "space-y-4"
          }
        >
          {state.message && (
            <p role="alert" className="max-sm:w-full flex-1 text-sm text-status-danger-text">
              {state.message}
            </p>
          )}
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="min-h-11">
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant={target.operation === "archive" || deleting ? "danger" : "primary"}
              className="min-h-11"
              isLoading={pending}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

type PersonDialogContentProps<Target extends DialogTarget> = {
  title: string;
  description: string;
  target?: Target;
  action?: PeopleAction<Target>;
  wide?: boolean;
  editor?: boolean;
  children?: React.ReactNode;
};

export function PersonDialogContent<Target extends DialogTarget = PersonTarget>({
  title,
  description,
  target,
  action,
  wide,
  editor,
  children,
  onCloseAutoFocus,
}: PersonDialogContentProps<Target> &
  Pick<React.ComponentProps<typeof DialogContent>, "onCloseAutoFocus">) {
  return (
    <DialogContent
      onCloseAutoFocus={onCloseAutoFocus}
      className={
        editor
          ? "max-h-[min(54rem,calc(100dvh_-_1rem))] w-[calc(100%_-_1rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
          : `max-h-[88dvh] w-[calc(100%_-_1.5rem)] overflow-y-auto ${wide ? "max-w-3xl" : "max-w-xl"}`
      }
    >
      {editor ? (
        <div className="border-b border-border-subtle px-4 py-4 pr-12 sm:px-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </div>
      ) : (
        <>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </>
      )}
      {target && action ? (
        <PersonForm target={target} action={action} editor={editor}>
          {children}
        </PersonForm>
      ) : (
        <div className="space-y-4">
          {children}
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-h-11">
              {copy.close}
            </Button>
          </DialogClose>
        </div>
      )}
    </DialogContent>
  );
}

export function PersonDialog<Target extends DialogTarget = PersonTarget>({
  label,
  primary,
  trigger,
  ...content
}: PersonDialogContentProps<Target> & {
  label: string;
  primary?: boolean;
  trigger?: Pick<ButtonProps, "variant" | "className" | "children">;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={trigger?.variant ?? (primary ? "primary" : "outline")}
          className={cn("min-h-11", trigger?.className)}
          aria-label={content.target?.operation === "create" ? label : content.title}
        >
          {trigger?.children ?? label}
        </Button>
      </DialogTrigger>
      {open && <PersonDialogContent {...content} />}
    </Dialog>
  );
}
