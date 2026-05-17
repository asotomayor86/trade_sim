import type { StrategySuffix } from "@prisma/client"

const VOWELS = /[aeiouáéíóúàèìòùäëïöüâêîôûãõ]/gi
const NON_ALPHA = /[^a-z]/gi
const STOP_WORDS = new Set(["el", "la", "los", "las", "un", "una", "de", "del", "en", "a", "y", "o"])

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics
    .toLowerCase()
}

/**
 * Derive a 3-letter code from an analysis name.
 * Algorithm:
 *  1. Split into words; skip stop words.
 *  2. Remove vowels from each word, keeping consonants in order.
 *  3. Take consonants sequentially across all words until we have 3.
 *  4. If still < 3 chars, pad with first letters of the original name.
 *  5. Uppercase the result.
 */
export function deriveBase(name: string): string {
  const words = normalize(name)
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .map((w) => w.replace(NON_ALPHA, ""))
    .filter((w) => w.length > 0)

  if (words.length === 0) return "XXX"

  let consonants = ""
  for (const word of words) {
    const wordConsonants = word.replace(VOWELS, "")
    consonants += wordConsonants
    if (consonants.length >= 3) break
  }

  if (consonants.length < 3) {
    // Pad with first letters of original words (deduplicated)
    for (const word of words) {
      const letter = word[0]
      if (!consonants.includes(letter)) consonants += letter
      if (consonants.length >= 3) break
    }
    // Final fallback: repeat last char
    while (consonants.length < 3) {
      consonants += consonants[consonants.length - 1] ?? "X"
    }
  }

  return consonants.slice(0, 3).toUpperCase()
}

/**
 * Generate a unique analysis code from a name, avoiding collisions with existing codes.
 * Returns "TND", "TND2", "TND3", etc.
 */
export function generateAnalysisCode(name: string, existingCodes: string[]): string {
  const base = deriveBase(name)
  const existing = new Set(existingCodes.map((c) => c.toUpperCase()))

  if (!existing.has(base)) return base

  for (let i = 2; i <= 999; i++) {
    const candidate = `${base}${i}`
    if (!existing.has(candidate)) return candidate
  }

  throw new Error(`No se pudo generar un código único para "${name}"`)
}

/**
 * Generate a strategy code from an analysis code and a suffix.
 * ("RSB", "BNC") → "RSB-BNC"
 */
export function generateStrategyCode(analysisCode: string, suffix: StrategySuffix): string {
  return `${analysisCode}-${suffix}`
}
