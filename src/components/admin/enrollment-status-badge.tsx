import React from "react";
import { Badge, type BadgeProps } from "@/components/ui";

const ENROLLMENT_STATUS_MAP: Record<
  string,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  confirmed: { label: "Confirmed", variant: "success" },
  pending: { label: "Pending payment", variant: "warning" },
  application_in_process: { label: "In process", variant: "info" },
  review_hold: { label: "Review hold", variant: "danger" },
  expired: { label: "Expired", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

const PAYMENT_STATUS_MAP: Record<
  string,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  paid: { label: "Paid", variant: "success" },
  validated: { label: "Validated", variant: "success" },
  unpaid: { label: "Unpaid", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  initiated: { label: "Initiated", variant: "info" },
  review_hold: { label: "Review hold", variant: "danger" },
  failed: { label: "Failed", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "outline" },
  expired: { label: "Expired", variant: "outline" },
  not_required: { label: "Free", variant: "primary" },
  refunded: { label: "Refunded", variant: "default" },
};

export function EnrollmentStatusBadge({ status }: { status: string }) {
  const mapped = ENROLLMENT_STATUS_MAP[status] ?? {
    label: status.replace(/_/g, " "),
    variant: "default" as const,
  };
  return (
    <Badge variant={mapped.variant} size="sm" dot>
      {mapped.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const mapped = PAYMENT_STATUS_MAP[status] ?? {
    label: status.replace(/_/g, " "),
    variant: "default" as const,
  };
  return (
    <Badge variant={mapped.variant} size="sm">
      {mapped.label}
    </Badge>
  );
}

