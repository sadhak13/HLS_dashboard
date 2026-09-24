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

export const branchFinanceRevisionSchema = z.object({
  branchId: z.string().uuid('Invalid branch'),
  rentType: z.enum(['fixed', 'percentage']),
  rentValue: z.coerce.number().nonnegative('Rent value must be zero or positive'),
  standardFeePerStudent: z.coerce.number().nonnegative('Fee must be zero or positive'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
})

export const coachSalaryChangeSchema = z.object({
  coachId: z.string().uuid('Invalid coach'),
  monthlySalary: z.coerce.number().nonnegative('Salary must be zero or positive'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
})

export const EXPENSE_CATEGORIES = [
  'equipment', 'transport', 'utilities', 'maintenance', 'medical', 'food', 'printing', 'licensing', 'misc',
] as const

export const EXPENSE_CATEGORY_LABELS: Record<typeof EXPENSE_CATEGORIES[number], string> = {
  equipment: 'Equipment / Procurement',
  transport: 'Transport',
  utilities: 'Utilities',
  maintenance: 'Maintenance & Repairs',
  medical: 'Medical & First Aid',
  food: 'Food & Refreshments',
  printing: 'Printing & Stationery',
  licensing: 'Licensing & Permits',
  misc: 'Miscellaneous',
}

export const ABSENCE_REASON_CATEGORIES = [
  'sick', 'injured', 'exams', 'family_function', 'travel', 'tournament_elsewhere', 'weather', 'other',
] as const

export const ABSENCE_REASON_LABELS: Record<typeof ABSENCE_REASON_CATEGORIES[number], string> = {
  sick: 'Sick',
  injured: 'Injured',
  exams: 'Exams / Studies',
  family_function: 'Family Function',
  travel: 'Travel',
  tournament_elsewhere: 'Tournament Elsewhere',
  weather: 'Weather',
  other: 'Other',
}

export const expenseSchema = z.object({
  branchId: z.string().uuid('Invalid branch').optional().or(z.literal('')),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().positive('Amount must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  description: z.string().min(3, 'Description must be at least 3 characters').transform(s => s.trim()),
})

export const forecastAssumptionsSchema = z.object({
  branchId: z.string().uuid('Invalid branch'),
  monthlyRevenueGrowthPct: z.coerce.number(),
  annualRentGrowthPct: z.coerce.number(),
  annualSalaryGrowthPct: z.coerce.number(),
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
