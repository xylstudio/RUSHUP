/**
 * Example: Login Form with React Hook Form & Zod
 * 
 * Shows how to use React Hook Form with Zod validation.
 * This replaces the old manual form state management approach.
 */

'use client'

import { useLoginForm } from '@/lib/hooks/useForms'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useFormErrors } from '@/lib/hooks/useForms'
import { useState } from 'react'

/**
 * Before (old way - lots of state management):
 * ```tsx
 * const [email, setEmail] = useState('')
 * const [password, setPassword] = useState('')
 * const [errors, setErrors] = useState({})
 * const [loading, setLoading] = useState(false)
 * 
 * const handleSubmit = async (e) => {
 *   e.preventDefault()
 *   // ... manual validation
 *   // ... manual error handling
 * }
 * ```
 * 
 * After (new way - 1 hook):
 * ```tsx
 * const { register, handleSubmit, formState: { errors } } = useLoginForm()
 * ```
 */

export default function LoginFormExample() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useLoginForm()
  const { getFieldError } = useFormErrors(errors)
  const [submitError, setSubmitError] = useState('')

  const onSubmit = async (data: any) => {
    try {
      setSubmitError('')
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }
      
      // Success - redirect or show message
    } catch (error: any) {
      setSubmitError(error.message)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">เข้าสู่ระบบ</h1>
      <p className="text-sm text-[#70706B] mb-6">กรอกข้อมูลเพื่อเข้าสู่ระบบ</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email Field */}
        <Input
          label="อีเมล"
          type="email"
          placeholder="your@email.com"
          error={getFieldError('email')}
          {...register('email')}
        />

        {/* Password Field */}
        <Input
          label="รหัสผ่าน"
          type="password"
          placeholder="••••••••"
          error={getFieldError('password')}
          {...register('password')}
        />

        {/* Submit Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </Button>
      </form>

      {/* Benefits of this approach */}
      <div className="mt-8 p-4 bg-[#F7F7F2] rounded-2xl text-[11px] text-[#70706B]">
        <p className="font-semibold mb-2">✨ Benefits:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Type-safe validation with Zod</li>
          <li>Auto-generated error messages in Thai</li>
          <li>Minimal re-renders</li>
          <li>Built-in form state management</li>
          <li>Error handling included</li>
        </ul>
      </div>
    </div>
  )
}
