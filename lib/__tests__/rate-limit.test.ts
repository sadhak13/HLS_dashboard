import { describe, it, expect } from 'vitest'
import { rateLimit } from '../rate-limit'

describe('rateLimit', () => {
  it('allows requests within the limit', () => {
    const result = rateLimit('test-allow', { maxRequests: 3, windowMs: 1000 })
    expect(result.success).toBe(true)
  })

  it('blocks requests exceeding the limit', () => {
    const key = 'test-block-' + Date.now()
    for (let i = 0; i < 5; i++) {
      rateLimit(key, { maxRequests: 5, windowMs: 10000 })
    }
    const result = rateLimit(key, { maxRequests: 5, windowMs: 10000 })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many requests')
  })

  it('resets after window expires', async () => {
    const key = 'test-reset-' + Date.now()
    for (let i = 0; i < 2; i++) {
      rateLimit(key, { maxRequests: 2, windowMs: 50 })
    }
    const blocked = rateLimit(key, { maxRequests: 2, windowMs: 50 })
    expect(blocked.success).toBe(false)

    await new Promise(r => setTimeout(r, 60))
    const after = rateLimit(key, { maxRequests: 2, windowMs: 50 })
    expect(after.success).toBe(true)
  })
})
