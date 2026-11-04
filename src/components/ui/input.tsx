import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = "text", label, helperText, error, id, disabled, required, ...props },
    ref
  ) => {
    // Generate fallback unique ID if not provided and label is present
    const generatedId = React.useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-semibold text-primary-900 select-none"
          >
            {label}
            {required && (
              <span className="text-status-danger-text ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            required={required}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn(
              "flex h-10 w-full rounded-lg border bg-surface-base px-3 py-2 text-sm text-text-primary " +
                "placeholder:text-text-muted transition-colors " +
                "focus-visible:outline-2 focus-visible:outline-offset-2 " +
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-muted",
              error
                ? "border-status-danger-solid focus-visible:outline-status-danger-solid text-status-danger-text"
                : "border-border-default hover:border-border-strong focus-visible:outline-primary-600 focus-visible:border-primary-600",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p
            id={errorId}
            className="text-xs font-medium text-status-danger-text animate-in fade-in"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
