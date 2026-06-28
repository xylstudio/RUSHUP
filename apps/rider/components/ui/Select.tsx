/**
 * shadcn/ui Select Component
 * 
 * Dropdown select component with React Hook Form integration.
 */

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/I18nContext";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
  helperText?: string
  options: Array<{ value: string; label: string }>
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, helperText, options, ...props }, ref) => {
    const { locale } = useI18n();
    return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
          {label}
          {props.required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            "flex h-12 w-full rounded-2xl border-2 border-[#E5E5DF] bg-white px-4 py-2 text-sm appearance-none transition-colors focus-visible:outline-none focus-visible:border-[#2A4532] focus-visible:ring-2 focus-visible:ring-[#2A4532]/10 disabled:cursor-not-allowed disabled:bg-[#F7F7F2] disabled:opacity-50",
            error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10",
            className
          )}
          ref={ref}
          {...props}
        >
          <option value="">{locale === 'en' ? '-- เลือก --' : locale === 'zh' ? '-- เลือก --' : '-- เลือก --'}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#70706B]" size={18} />
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#70706B] mt-1.5">{helperText}</p>}
    </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
