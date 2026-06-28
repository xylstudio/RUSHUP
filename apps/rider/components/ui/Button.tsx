/**
 * shadcn/ui Button Component
 * 
 * Base button component that can be extended with variants.
 * Styled with Tailwind CSS following Xylem design system.
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border-2 border-[#E5E5DF] bg-white text-[#1A1A1A] hover:bg-[#F7F7F2]",
        secondary: "bg-[#2A4532] text-white hover:bg-[#3A5542]",
        ghost: "hover:bg-[#F7F7F2] text-[#1A1A1A]",
        link: "text-[#2A4532] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-2 uppercase tracking-wider",
        sm: "h-9 px-3 text-xs uppercase tracking-wider",
        lg: "h-14 px-8 text-base uppercase tracking-wider",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
