import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-xl border border-border bg-surface-white px-3 py-2 text-sm text-text-primary transition-shadow placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-text-tertiary disabled:opacity-70",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
