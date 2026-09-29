import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "soft-brand";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none";

    const variantStyles = {
      primary:
        "bg-brand text-white hover:bg-brand-hover shadow-sm hover:shadow active:bg-brand-hover",
      secondary:
        "bg-surface text-text-primary border border-border hover:bg-surface-muted hover:border-text-secondary/30",
      "soft-brand":
        "bg-brand-soft text-brand hover:bg-brand-soft/80 border border-brand/20",
      outline:
        "border border-border text-text-primary bg-transparent hover:bg-surface-muted hover:border-text-secondary/40",
      ghost:
        "text-text-primary hover:bg-surface-muted active:bg-border/40",
      danger:
        "bg-danger text-white hover:bg-danger/90 shadow-sm",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-xs rounded-xl gap-1.5",
      md: "h-11 px-5 text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-base rounded-xl gap-2.5",
      icon: "h-10 w-10 rounded-xl p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
