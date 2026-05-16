interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>()

/** Devuelve true si la petición está permitida, false si ha superado el límite. */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 10 * 60 * 1000  // 10 min
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxAttempts) return false

  entry.count++
  return true
}

/** Limpia entradas expiradas (llamar ocasionalmente para evitar fugas de memoria). */
export function pruneRateLimits() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}
