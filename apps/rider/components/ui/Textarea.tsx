/**
 * shadcn/ui Textarea Component
 * 
 * Multi-line text input for longer form fields.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
  helperText?: string
  characterLimit?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, characterLimit, value, onChange, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState(String(value || '').length)
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      onChange?.(e)
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            {label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[120px] w-full rounded-2xl border-2 border-[#E5E5DF] bg-white px-4 py-2 text-sm resize-none transition-colors placeholder:text-[#B5B5B0] focus-visible:outline-none focus-visible:border-[#2A4532] focus-visible:ring-2 focus-visible:ring-[#2A4532]/10 disabled:cursor-not-allowed disabled:bg-[#F7F7F2] disabled:opacity-50",
            error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10",
            className
          )}
          ref={ref}
          value={value}
          onChange={handleChange}
          {...props}
        />
        <div className="flex justify-between items-center mt-1.5">
          <div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {helperText && !error && <p className="text-xs text-[#70706B]">{helperText}</p>}
          </div>
          {characterLimit && (
            <p className={cn(
              "text-xs",
              charCount > characterLimit * 0.8 ? "text-red-600 font-semibold" : "text-[#70706B]"
            )}>
              {charCount} / {characterLimit}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
