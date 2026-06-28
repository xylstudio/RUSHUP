'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ExclamationCircleIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon 
} from "@heroicons/react/24/solid";

interface FormInputProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea';
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  errorType?: 'error' | 'warning';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number | string;
  rows?: number;
  helperText?: string;
  autoComplete?: string;
  isEdit?: boolean;
  'data-testid'?: string;
}

const FormInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormInputProps>(
  (
    {
      name,
      label,
      type = 'text',
      value,
      onChange,
      onBlur,
      error,
      errorType = 'error',
      placeholder,
      required = false,
      disabled = false,
      maxLength,
      min,
      max,
      step,
      rows = 3,
      helperText,
      autoComplete,
      isEdit = false,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasBeenTouched, setHasBeenTouched] = useState(false);
    
    // Determine visual state - ใน edit mode ไม่แสดง visual states
    const hasValue = value && value.toString().trim() !== '';
    const hasError = error && hasBeenTouched;
    const isValid = hasValue && !hasError && hasBeenTouched && !isEdit; // ไม่แสดง valid state ใน edit mode
    const isWarning = hasError && errorType === 'warning';
    
    // Input state classes
    const getInputStateClasses = () => {
      if (disabled) return 'border-gray-200 bg-gray-50 text-gray-500';
      
      // Error states (แสดงทั้ง add และ edit mode)
      if (hasError && !isWarning) return 'border-red-300 bg-red-50 text-red-900 ring-red-200 focus:border-red-500 focus:ring-red-200';
      if (isWarning) return 'border-amber-300 bg-amber-50 text-amber-900 ring-amber-200 focus:border-amber-500 focus:ring-amber-200';
      
      // ใน edit mode: ใช้ style พื้นฐานเสมอ
      if (isEdit) {
        if (isFocused) return 'border-xylem-dark bg-white ring-xylem-light';
        return 'border-gray-300 bg-white hover:border-gray-400 focus:border-xylem-dark focus:ring-xylem-light';
      }
      
      // Add mode: แสดง visual states
      if (isValid) return 'border-xylem-dark bg-xylem-dark/5 text-xylem-dark ring-xylem-light focus:border-xylem-dark focus:ring-xylem-light';
      if (isFocused) return 'border-xylem-dark bg-white ring-xylem-light';
      return 'border-gray-300 bg-white hover:border-gray-400 focus:border-xylem-dark focus:ring-xylem-light';
    };

    // Label classes
    const getLabelClasses = () => {
      const baseClasses = 'block text-sm font-medium transition-colors duration-200';
      if (disabled) return `${baseClasses} text-gray-400`;
      if (hasError && !isWarning) return `${baseClasses} text-red-700`;
      if (isWarning) return `${baseClasses} text-amber-700`;
      if (isValid && !isEdit) return `${baseClasses} text-xylem-dark`; // ไม่แสดงสีเขียวใน edit mode
      return `${baseClasses} text-gray-700`;
    };

    // Icon component
    const StateIcon = () => {
      // แสดง icon เฉพาะเมื่อมี error/warning
      if (hasError && !isWarning) {
        return (
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 transition-opacity duration-200" />
        );
      }
      
      if (isWarning) {
        return (
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 transition-opacity duration-200" />
        );
      }
      
      // ใน add mode: แสดง check icon
      if (isValid && !isEdit) {
        return (
          <CheckCircleIcon className="h-5 w-5 text-xylem-dark transition-opacity duration-200" />
        );
      }
      
      return null;
    };

    // Handler functions
    const handleFocus = (e: React.FocusEvent) => {
      setIsFocused(true);
      if (!hasBeenTouched) setHasBeenTouched(true);
    };

    const handleBlur = (e: React.FocusEvent) => {
      setIsFocused(false);
      setHasBeenTouched(true);
      onBlur?.();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    // Determine if we should show icon
    const shouldShowIcon = hasError || (isValid && !isEdit);

    // Common input props
    const commonProps = {
      id: name,
      name,
      value: value || '',
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      disabled,
      placeholder,
      maxLength,
      autoComplete,
      'data-testid': testId,
      'aria-describedby': [
        error ? `${name}-error` : null,
        helperText ? `${name}-help` : null
      ].filter(Boolean).join(' ') || undefined,
      'aria-invalid': hasError ? true : undefined,
      className: cn(
        // Base styles
        'block w-full rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ease-in-out',
        'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50',
        // State-specific styles
        getInputStateClasses(),
        // Icon padding - แสดง padding เฉพาะเมื่อมี icon
        shouldShowIcon ? 'pr-10' : 'pr-3'
      ),
    };

    return (
      <div className="w-full">
        {/* Label */}
        <label htmlFor={name} className={getLabelClasses()}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* Input Container */}
        <div className="mt-1 relative">
          {type === 'textarea' ? (
            <textarea
              {...(commonProps as any)}
              rows={rows}
              ref={ref as React.Ref<HTMLTextAreaElement>}
            />
          ) : (
            <input
              {...(commonProps as any)}
              type={type}
              min={min}
              max={max}
              step={step}
              ref={ref as React.Ref<HTMLInputElement>}
            />
          )}

          {/* State Icon */}
          {shouldShowIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <StateIcon />
            </div>
          )}
        </div>

        {/* Helper Text */}
        {helperText && !hasError && (
          <p id={`${name}-help`} className="mt-1 text-xs text-gray-500">
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {hasError && (
          <p 
            id={`${name}-error`} 
            className={`mt-1 text-xs flex items-center gap-1 animate-fade-in ${
              isWarning ? 'text-amber-700' : 'text-red-700'
            }`}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export { FormInput }; 