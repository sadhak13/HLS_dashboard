const requests = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  maxRequests?: number
  windowMs?: number
}

export function rateLimit(
  key: string,
  { maxRequests = 10, windowMs = 60_000 }: RateLimitOptions = {}
): { success: boolean; error?: string } {
  const now = Date.now()
  const entry = requests.get(key)

  if (!entry || now > entry.resetTime) {
    requests.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true }
  }

  if (entry.count >= maxRequests) {
    const waitSeconds = Math.ceil((entry.resetTime - now) / 1000)
    return { success: false, error: `Too many requests. Please try again in ${waitSeconds}s.` }
  }

  entry.count++
  return { success: true }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of requests) {
    if (now > entry.resetTime) requests.delete(key)
  }
}, 60_000)
