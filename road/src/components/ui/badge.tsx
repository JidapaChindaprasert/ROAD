import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "reported" | "repairing" | "fixed" | "danger" | "neutral" | "brand" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium transition-colors select-none";

  const variantStyles = {
    reported: "bg-reported-soft text-reported border border-reported-border",
    repairing: "bg-repairing-soft text-repairing border border-repairing-border",
    fixed: "bg-fixed-soft text-fixed border border-fixed-border",
    danger: "bg-danger-soft text-danger border border-danger-border",
    brand: "bg-brand-soft text-brand border border-brand/20",
    neutral: "bg-surface-muted text-text-secondary border border-border",
    outline: "bg-transparent text-text-secondary border border-border",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs rounded-full gap-1",
    md: "px-2.5 py-1 text-xs rounded-full gap-1.5",
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props}>
      {children}
    </span>
  );
}
