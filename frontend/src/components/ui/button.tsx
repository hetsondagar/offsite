import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.98] touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted/50 active:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-muted/50 active:bg-muted text-foreground",
        link: "text-primary underline-offset-4 hover:underline active:opacity-80",
        glow: "bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:shadow-md",
        success: "bg-success text-success-foreground shadow-sm hover:bg-success/90 active:bg-success/95",
        warning: "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 active:bg-warning/95",
      },
      size: {
        default: "h-12 min-h-[48px] px-6 py-3 text-sm",
        sm: "h-10 min-h-[40px] rounded-lg px-4 text-xs",
        lg: "h-14 min-h-[56px] rounded-xl px-8 text-base",
        xl: "h-16 min-h-[64px] rounded-2xl px-10 text-lg",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px]",
        "icon-sm": "h-10 w-10 min-h-[40px] min-w-[40px]",
        "icon-lg": "h-14 w-14 min-h-[56px] min-w-[56px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
