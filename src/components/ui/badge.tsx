import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "accent"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-surface-muted text-primary-900 border-border-subtle",
    primary: "bg-primary-50 text-primary-900 border-primary-200",
    accent: "bg-accent-100 text-accent-800 border-accent-300",
    success: "bg-status-success-bg text-status-success-text border-status-success-border",
    warning: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
    danger: "bg-status-danger-bg text-status-danger-text border-status-danger-border",
    info: "bg-status-info-bg text-status-info-text border-status-info-border",
    outline: "bg-transparent text-text-secondary border-border-default",
  }[variant];

  const dotStyles = {
    default: "bg-text-secondary",
    primary: "bg-primary-600",
    accent: "bg-accent-600",
    success: "bg-status-success-solid",
    warning: "bg-status-warning-solid",
    danger: "bg-status-danger-solid",
    info: "bg-status-info-solid",
    outline: "bg-text-muted",
  }[variant];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-md border tracking-wide uppercase transition-colors",
        variantStyles,
        sizeStyles,
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles)} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
