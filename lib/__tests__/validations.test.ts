import { describe, it, expect } from 'vitest'
import { playerSchema } from '../validations'

describe('playerSchema', () => {
  const validData = {
    fullName: '  Rahul  Kumar  ',
    dob: '2015-06-15',
    gender: 'male',
    parentName: 'Suresh Kumar',
    parentPhone: '9876543210',
    branchId: '550e8400-e29b-41d4-a716-446655440000',
    batchId: '',
    status: 'active',
    enrolledDate: '2024-01-15',
    aadharNumber: '',
  }

  it('validates and trims a valid player', () => {
    const result = playerSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Rahul Kumar')
    }
  })

  it('rejects an invalid phone number', () => {
    const result = playerSchema.safeParse({ ...validData, parentPhone: '123' })
    expect(result.success).toBe(false)
  })

  it('rejects a short name', () => {
    const result = playerSchema.safeParse({ ...validData, fullName: 'AB' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid branchId', () => {
    const result = playerSchema.safeParse({ ...validData, branchId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid aadhar number', () => {
    const result = playerSchema.safeParse({ ...validData, aadharNumber: '123456789012' })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid aadhar number', () => {
    const result = playerSchema.safeParse({ ...validData, aadharNumber: '12345' })
    expect(result.success).toBe(false)
  })
})
