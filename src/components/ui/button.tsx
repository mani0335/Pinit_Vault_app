import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-gray-800 border border-gray-700 font-semibold",
        destructive: "bg-black text-white hover:bg-gray-800 border border-red-600",
        outline: "border-2 border-black bg-white text-black hover:bg-gray-100 font-semibold",
        secondary: "bg-black text-white hover:bg-gray-800 border border-gray-600",
        ghost: "hover:bg-black/20 text-black font-semibold",
        link: "text-black underline-offset-4 hover:underline font-semibold",
        cyber: "bg-black border-2 border-cyan-400 text-cyan-400 hover:bg-gray-900 glow-cyan font-display tracking-wider uppercase font-bold shadow-lg shadow-cyan-400/25",
        "cyber-secondary": "bg-black border-2 border-purple-400 text-purple-400 hover:bg-gray-900 glow-purple font-display tracking-wider uppercase font-bold shadow-lg shadow-purple-400/25",
        "cyber-accent": "bg-black border-2 border-pink-400 text-pink-400 hover:bg-gray-900 glow-pink font-display tracking-wider uppercase font-bold shadow-lg shadow-pink-400/25",
      },
      size: {
        default: "h-12 px-6 py-3 text-base",
        sm: "h-10 rounded-md px-3 text-sm",
        lg: "h-14 rounded-md px-8 text-lg font-bold",
        icon: "h-12 w-12",
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
