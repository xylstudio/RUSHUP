/**
 * shadcn/ui Form Input Component
 * 
 * Enhanced form input with error display and validation styling.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
          {label}
          {props.required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border-2 border-[#E5E5DF] bg-white px-4 py-2 text-sm transition-colors placeholder:text-[#B5B5B0] focus-visible:outline-none focus-visible:border-[#2A4532] focus-visible:ring-2 focus-visible:ring-[#2A4532]/10 disabled:cursor-not-allowed disabled:bg-[#F7F7F2] disabled:opacity-50",
          error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#70706B] mt-1.5">{helperText}</p>}
    </div>
  )
)
Input.displayName = "Input"

export { Input }
