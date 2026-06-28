/**
 * Custom React Hook Form Hooks for Xylem Project
 * 
 * Pre-configured hooks for common forms with built-in validation
 * and error handling.
 * 
 * @example
 * ```tsx
 * import { useLoginForm } from '@/lib/hooks/useForms'
 * 
 * function LoginPage() {
 *   const { control, handleSubmit, errors } = useLoginForm()
 *   // ...
 * }
 * ```
 */

import { useForm, UseFormProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  loginSchema,
  registerSchema,
  houseSchema,
  serviceBookingSchema,
  measurementRequestSchema,
  paymentSchema,
  serviceTemplateSchema,
  assignJobSchema,
  type LoginInput,
  type RegisterInput,
  type HouseInput,
  type ServiceBookingInput,
  type MeasurementRequestInput,
  type PaymentInput,
  type ServiceTemplateInput,
  type AssignJobInput,
} from '../schemas'

// ============================================
// Auth Hooks
// ============================================

/**
 * Login form hook
 */
export function useLoginForm(props?: UseFormProps<LoginInput>) {
  return useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    ...props,
  })
}

/**
 * Register form hook
 */
export function useRegisterForm(props?: UseFormProps<RegisterInput>) {
  return useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    ...props,
  })
}

// ============================================
// Property Hooks
// ============================================

/**
 * House form hook
 */
export function useHouseForm(props?: UseFormProps<HouseInput>) {
  return useForm<HouseInput>({
    resolver: zodResolver(houseSchema),
    mode: 'onBlur',
    defaultValues: {
      area: 100,
      houseType: 'single-house',
    },
    ...props,
  })
}

// ============================================
// Booking Hooks
// ============================================

/**
 * Service booking form hook
 */
export function useServiceBookingForm(props?: UseFormProps<ServiceBookingInput>) {
  return useForm<ServiceBookingInput>({
    resolver: zodResolver(serviceBookingSchema),
    mode: 'onChange',
    defaultValues: {
      pricingPeriod: 'monthly',
      serviceArea: 100,
    },
    ...props,
  })
}

/**
 * Measurement request form hook
 */
export function useMeasurementRequestForm(props?: UseFormProps<MeasurementRequestInput>) {
  return useForm<MeasurementRequestInput>({
    resolver: zodResolver(measurementRequestSchema),
    mode: 'onChange',
    defaultValues: {
      preferredTime: 'morning',
    },
    ...props,
  })
}

// ============================================
// Payment Hooks
// ============================================

/**
 * Payment form hook
 */
export function usePaymentForm(props?: UseFormProps<PaymentInput>) {
  return useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      paymentMethod: 'credit-card',
    },
    ...props,
  })
}

// ============================================
// Admin Hooks
// ============================================

/**
 * Service template form hook
 */
export function useServiceTemplateForm(props?: UseFormProps<ServiceTemplateInput>) {
  return useForm<ServiceTemplateInput>({
    resolver: zodResolver(serviceTemplateSchema),
    mode: 'onBlur',
    defaultValues: {
      basePrice: 0,
      pricePerUnit: 0,
      billingType: 'one-time',
      estimatedDuration: 1,
      durationUnit: 'hours',
    },
    ...props,
  })
}

/**
 * Assign job form hook
 */
export function useAssignJobForm(props?: UseFormProps<AssignJobInput>) {
  return useForm<AssignJobInput>({
    resolver: zodResolver(assignJobSchema),
    mode: 'onChange',
    ...props,
  })
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to get error message for a field
 * 
 * @example
 * ```tsx
 * const { getFieldError } = useFormErrors(formState.errors)
 * const error = getFieldError('email')
 * ```
 */
export function useFormErrors<T extends Record<string, any>>(
  errors: Record<string, any>
) {
  return {
    getFieldError: (field: string): string => {
      return errors[field]?.message || ''
    },
    hasErrors: Object.keys(errors).length > 0,
    errorCount: Object.keys(errors).length,
  }
}

/**
 * Hook for form submission with async handler
 * 
 * @example
 * ```tsx
 * const handleSubmit = useFormSubmit(
 *   async (data) => {
 *     return await submitForm(data)
 *   },
 *   onSuccess: () => toast.success('บันทึกสำเร็จ')
 * )
 * ```
 */
export function useFormSubmit<T extends Record<string, any>>(
  onSubmit: (data: T) => Promise<any>,
  options?: {
    onSuccess?: (data: any) => void
    onError?: (error: Error) => void
  }
) {
  return async (data: T) => {
    try {
      const result = await onSubmit(data)
      options?.onSuccess?.(result)
    } catch (error) {
      options?.onError?.(error as Error)
    }
  }
}
