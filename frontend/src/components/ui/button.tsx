import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "warning"
    | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const variantClasses = {
      default:
        "bg-primary text-white hover:opacity-90 disabled:opacity-50",
      outline:
        "border border-border bg-transparent text-text-primary hover:bg-gray-100 disabled:opacity-50",
      ghost:
        "bg-transparent text-text-primary hover:bg-gray-100 disabled:opacity-50",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
      warning:
        "bg-warning text-white hover:opacity-90 disabled:opacity-50",
      link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs rounded-lg",
      md: "px-4 py-2.5 text-sm rounded-xl",
      lg: "px-5 py-3 text-base rounded-xl",
      icon: "h-9 w-9 rounded-lg flex items-center justify-center",
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
