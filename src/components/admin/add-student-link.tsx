import React from "react";
import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { manualAdmissionCopy as copy } from "@/lib/admin-manual-admission";
import { adminPaths } from "@/lib/admin-navigation";

export function AddStudentLink({ batchId, inverse }: { batchId?: string; inverse?: boolean }) {
  const href = batchId
    ? `${adminPaths.addStudent}?${new URLSearchParams({ batchId })}`
    : adminPaths.addStudent;

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${inverse ? "bg-surface-card text-primary-900 hover:bg-primary-50 focus-visible:outline-primary-200" : "bg-primary-800 text-text-inverse hover:bg-primary-700 focus-visible:outline-primary-600"}`}
    >
      <UserRoundPlus className="size-4" aria-hidden="true" />
      {copy.title}
    </Link>
  );
}
