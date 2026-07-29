import { z } from 'zod'

export const playerSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters').transform(s => s.trim().replace(/\s+/g, ' ')),
  dob: z.string().optional().default(''),
  gender: z.enum(['male', 'female', 'other']).optional().default('male'),
  parentName: z.string().min(3, 'Parent name must be at least 3 characters').transform(s => s.trim()),
  parentPhone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  branchId: z.string().uuid('Invalid branch'),
  batchId: z.string().uuid('Invalid batch').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'dropped']).optional().default('active'),
  enrolledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().default(() => new Date().toISOString().split('T')[0]),
  aadharNumber: z.string().regex(/^\d{12}$/, 'Aadhar must be exactly 12 digits').optional().or(z.literal('')),
})

export const coachAccountSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(3, 'Full name must be at least 3 characters').transform(s => s.trim()),
  branchId: z.string().uuid('Invalid branch'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  batchIds: z.array(z.string().uuid()).min(1, 'At least one batch must be assigned'),
})

export const feeGenerationSchema = z.object({
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
})

export const feeSchema = z.object({
  playerId: z.string().uuid('Invalid player'),
  branchId: z.string().uuid('Invalid branch'),
  amount: z.number().positive('Amount must be positive'),
  modeOfPayment: z.enum(['cash', 'online', 'cash+online']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
})

export function parseFormData<T extends z.ZodType>(schema: T, formData: FormData): z.infer<T> | { error: string } {
  const raw: Record<string, unknown> = {}
  formData.forEach((value, key) => {
    raw[key] = value
  })
  const result = schema.safeParse(raw)
  if (!result.success) {
    const firstError = result.error.issues[0]
    return { error: firstError.message }
  }
  return result.data
}
