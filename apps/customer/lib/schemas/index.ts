/**
 * Zod Validation Schemas for Xylem Project
 * 
 * Type-safe form validation using Zod.
 * Used with React Hook Form for automatic validation and error handling.
 * 
 * @example
 * ```tsx
 * import { loginSchema } from '@/lib/schemas/auth'
 * 
 * function LoginForm() {
 *   const { control, handleSubmit } = useForm({
 *     resolver: zodResolver(loginSchema)
 *   })
 * }
 * ```
 */

import { z } from 'zod'

// ============================================
// Auth Schemas
// ============================================

/**
 * Login form validation
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('กรุณากรอก email ที่ถูกต้อง')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Register form validation
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email('กรุณากรอก email ที่ถูกต้อง')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .regex(/[A-Z]/, 'รหัสผ่านต้องมีอักษรใหญ่อย่างน้อย 1 ตัว')
    .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')
    .regex(/[^A-Za-z0-9]/, 'รหัสผ่านต้องมีอักษรพิเศษอย่างน้อย 1 ตัว'),
  confirmPassword: z.string(),
  fullName: z
    .string()
    .min(2, 'กรุณากรอกชื่อจริง')
    .max(100),
  phone: z
    .string()
    .regex(/^0[0-9]{8,9}$/, 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (เช่น 0812345678)'),
  termsAccepted: z
    .boolean()
    .refine((val: boolean) => val === true, 'กรุณายอมรับข้อตกลง'),
}).refine((data: any) => data.password === data.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
})

export type RegisterInput = z.infer<typeof registerSchema>

// ============================================
// House/Property Schemas
// ============================================

/**
 * House form validation
 */
export const houseSchema = z.object({
  name: z
    .string()
    .min(2, 'กรุณากรอกชื่อบ้าน')
    .max(100),
  address: z
    .string()
    .min(5, 'กรุณากรอกที่อยู่ที่ชัดเจน'),
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string().min(1, 'กรุณาเลือกอำเภอ'),
  subdistrict: z.string().min(1, 'กรุณาเลือกตำบล'),
  postalCode: z
    .string()
    .regex(/^[0-9]{5}$/, 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'),
  area: z
    .number()
    .min(1, 'พื้นที่ต้องมากกว่า 0')
    .max(999999, 'พื้นที่ต้องน้อยกว่า 1,000,000 ตร.ม.'),
  houseType: z.enum(['single-house', 'townhouse', 'apartment', 'condo', 'commercial'], {
    errorMap: () => ({ message: 'กรุณาเลือกประเภทบ้าน' })
  }),
  phone: z
    .string()
    .regex(/^0[0-9]{8,9}$/, 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง'),
  contactPerson: z.string().min(2, 'กรุณากรอกชื่อผู้ติดต่อ'),
  notes: z.string().optional(),
})

export type HouseInput = z.infer<typeof houseSchema>

// ============================================
// Service Booking Schemas
// ============================================

/**
 * Service booking form validation
 */
export const serviceBookingSchema = z.object({
  houseCode: z
    .string()
    .min(1, 'กรุณาเลือกบ้าน'),
  serviceCode: z
    .string()
    .min(1, 'กรุณาเลือกบริการ'),
  templateId: z
    .string()
    .min(1, 'กรุณาเลือกแพ็กเกจราคา'),
  serviceArea: z
    .number()
    .min(1, 'พื้นที่ต้องมากกว่า 0')
    .max(999999),
  pricingPeriod: z.enum(['monthly', 'yearly', 'one-time'], {
    errorMap: () => ({ message: 'กรุณาเลือกระยะเวลา' })
  }),
  scheduledDate: z
    .string()
    .refine((date: string) => new Date(date) > new Date(), 'กรุณาเลือกวันที่ในอนาคต'),
  additionalNotes: z.string().optional(),
})

export type ServiceBookingInput = z.infer<typeof serviceBookingSchema>

// ============================================
// Measurement Request Schema
// ============================================

/**
 * Measurement request form validation
 */
export const measurementRequestSchema = z.object({
  houseCode: z
    .string()
    .min(1, 'กรุณาเลือกบ้าน'),
  preferredDate: z
    .string()
    .refine((date: string) => {
      const requestDate = new Date(date)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return requestDate >= tomorrow
    }, 'กรุณาเลือกวันที่ตั้งแต่พรุ่งนี้ขึ้นไป'),
  preferredTime: z.enum(['morning', 'afternoon', 'evening']),
  notes: z
    .string()
    .max(500, 'หมายเหตุต้องไม่เกิน 500 ตัวอักษร')
    .optional(),
})

export type MeasurementRequestInput = z.infer<typeof measurementRequestSchema>

// ============================================
// Payment Schema
// ============================================

/**
 * Payment form validation
 */
export const paymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z
    .number()
    .min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  paymentMethod: z.enum(['credit-card', 'bank-transfer', 'promptpay'], {
    errorMap: () => ({ message: 'กรุณาเลือกวิธีการชำระเงิน' })
  }),
  notes: z.string().optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>

// ============================================
// Staff/Admin Schemas
// ============================================

/**
 * Create service template validation
 */
export const serviceTemplateSchema = z.object({
  serviceName: z
    .string()
    .min(2, 'กรุณากรอกชื่อบริการ')
    .max(100),
  category: z
    .string()
    .min(1, 'กรุณาเลือกหมวดหมู่'),
  description: z
    .string()
    .min(10, 'คำอธิบายต้องมีอย่างน้อย 10 ตัวอักษร')
    .max(1000),
  basePrice: z
    .number()
    .min(0, 'ราคาต้องเป็นตัวเลขบวก'),
  pricePerUnit: z
    .number()
    .min(0, 'ราคาต่อหน่วยต้องเป็นตัวเลขบวก'),
  billingType: z.enum(['one-time', 'recurring', 'both']),
  estimatedDuration: z
    .number()
    .min(1, 'ระยะเวลาต้องมากกว่า 0'),
  durationUnit: z.enum(['hours', 'days', 'weeks', 'months']),
})

export type ServiceTemplateInput = z.infer<typeof serviceTemplateSchema>

/**
 * Assign job validation
 */
export const assignJobSchema = z.object({
  jobId: z.string().min(1, 'กรุณาเลือกงาน'),
  staffId: z.string().min(1, 'กรุณาเลือกพนักงาน'),
  scheduledDate: z
    .string()
    .refine((date: string) => new Date(date) > new Date(), 'กรุณาเลือกวันที่ในอนาคต'),
  notes: z.string().optional(),
})

export type AssignJobInput = z.infer<typeof assignJobSchema>

// ============================================
// Utility Functions
// ============================================

/**
 * Generic error formatter for form display
 */
export function getFieldError(error: z.ZodIssue | undefined): string {
  if (!error) return ''
  return error.message
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors<T>(errors: z.ZodError<T>) {
  const formatted: Record<string, string> = {}
  errors.errors.forEach((error: any) => {
    const path = error.path.join('.')
    formatted[path] = error.message
  })
  return formatted
}
