import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkipLinkProps {
  targetId?: string;
  label?: string;
  className?: string;
}

/**
 * Accessible Skip Link primitive (WCAG 2.2 AA 2.4.1 Bypass Blocks).
 * Remains visually hidden until focused via keyboard navigation.
 */
export function SkipLink({
  targetId = "main-content",
  label = "Skip to main content",
  className,
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50",
        "focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-primary-900 focus:text-text-inverse",
        "focus:shadow-lg focus:font-semibold focus:text-sm focus:outline-2 focus:outline-offset-2",
        "focus:outline-accent-400 transition-all duration-150",
        className
      )}
    >
      {label}
    </a>
  );
}
