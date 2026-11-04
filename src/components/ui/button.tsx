import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none " +
      "disabled:pointer-events-none disabled:opacity-50 " +
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 " +
      "active:scale-[0.98] transition-transform";

    const variantStyles = {
      primary:
        "bg-primary-800 text-text-inverse hover:bg-primary-700 active:bg-primary-900 shadow-xs",
      secondary:
        "bg-surface-muted text-primary-900 hover:bg-border-subtle active:bg-border-default border border-border-subtle shadow-xs",
      accent:
        "bg-accent-600 text-text-inverse hover:bg-accent-700 active:bg-accent-800 shadow-xs focus-visible:outline-accent-600",
      outline:
        "border border-border-default bg-transparent text-primary-900 hover:bg-surface-muted active:bg-border-subtle",
      ghost: "bg-transparent text-primary-900 hover:bg-surface-muted active:bg-border-subtle",
      danger:
        "bg-status-danger-solid text-text-inverse hover:bg-red-800 active:bg-red-900 shadow-xs focus-visible:outline-status-danger-solid",
    }[variant];

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-md gap-1.5",
      md: "h-10 px-4 text-sm rounded-lg gap-2",
      lg: "h-12 px-6 text-base rounded-xl gap-2.5 min-h-[44px]", // WCAG 2.5.8 touch target
      icon: "h-10 w-10 p-2 rounded-lg justify-center",
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? "true" : undefined}
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
