/**
 * Pure CSV serialization/deserialization for Analysis and Strategy entities.
 * UTF-8 without BOM, comma separator, double-quote escaping, LF line endings.
 * Each entity produces a 2-row CSV: header line + single data row.
 */

// ---- Low-level CSV primitives ----

function escapeField(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildRow(values: string[]): string {
  return values.map(escapeField).join(",")
}

/** Parse a single CSV row, respecting quoted fields. */
export function parseCsvRow(line: string): string[] {
  const fields: string[] = []
  let cur = ""
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        cur += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ",") {
        fields.push(cur)
        cur = ""
        i++
      } else {
        cur += ch
        i++
      }
    }
  }
  fields.push(cur)
  return fields
}

/** Split content into non-empty lines, stripping \r. */
function splitLines(content: string): string[] {
  return content.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.trim() !== "")
}

export type ParseResult<T> = { ok: T } | { error: string }

// ---- Analysis ----

const ANALYSIS_HEADERS = ["code", "name", "description", "bias", "isStandard", "indicators"] as const

export interface SerializableAnalysis {
  code: string
  name: string
  descripcion?: string | null
  bias: string
  isStandard: boolean
  indicators: object[]
}

export interface ParsedAnalysis {
  code: string
  name: string
  description: string
  bias: string
  isStandard: boolean
  indicators: object[]
}

export function serializeAnalysisToCsv(a: SerializableAnalysis): string {
  const header = buildRow([...ANALYSIS_HEADERS])
  const data = buildRow([
    a.code,
    a.name,
    a.descripcion ?? "",
    a.bias,
    String(a.isStandard),
    JSON.stringify(a.indicators),
  ])
  return header + "\n" + data + "\n"
}

export function parseAnalysisCsv(content: string): ParseResult<ParsedAnalysis> {
  const lines = splitLines(content)
  if (lines.length < 2) return { error: "CSV debe tener al menos 2 líneas (cabecera + datos)" }

  const headers = parseCsvRow(lines[0])
  const expected = [...ANALYSIS_HEADERS]
  for (const h of expected) {
    if (!headers.includes(h)) return { error: `Columna faltante: "${h}"` }
  }

  const values = parseCsvRow(lines[1])
  const idx = (name: string) => headers.indexOf(name)

  const code = values[idx("code")]?.trim()
  if (!code) return { error: "Campo 'code' vacío" }

  const name = values[idx("name")]?.trim()
  if (!name) return { error: "Campo 'name' vacío" }

  const indicatorsRaw = values[idx("indicators")]?.trim()
  let indicators: object[] = []
  try {
    const parsed = JSON.parse(indicatorsRaw || "[]")
    if (!Array.isArray(parsed)) return { error: "Campo 'indicators' debe ser un array JSON" }
    indicators = parsed
  } catch {
    return { error: `Campo 'indicators' contiene JSON inválido: ${indicatorsRaw?.slice(0, 40)}` }
  }

  const isStandardRaw = values[idx("isStandard")]?.trim().toLowerCase()
  const isStandard = isStandardRaw === "true"

  return {
    ok: {
      code,
      name,
      description: values[idx("description")]?.trim() ?? "",
      bias: values[idx("bias")]?.trim() || "NEUTRAL",
      isStandard,
      indicators,
    },
  }
}

// ---- Strategy ----

const STRATEGY_HEADERS = [
  "code", "name", "description", "analysisCode",
  "suffix", "entryRule", "entryParams",
  "exitTargetType", "exitTargetValue",
  "stopLossType", "stopLossValue", "isStandard",
] as const

export interface SerializableStrategy {
  code: string
  name: string
  description?: string | null
  analysisCode: string
  suffix: string
  entryRule: string
  entryParams: object
  exitTargetType: string
  exitTargetValue: number
  stopLossType: string
  stopLossValue: number
  isStandard: boolean
}

export interface ParsedStrategy {
  code: string
  name: string
  description: string
  analysisCode: string
  suffix: string
  entryRule: string
  entryParams: object
  exitTargetType: string
  exitTargetValue: number
  stopLossType: string
  stopLossValue: number
  isStandard: boolean
}

export function serializeStrategyToCsv(s: SerializableStrategy): string {
  const header = buildRow([...STRATEGY_HEADERS])
  const data = buildRow([
    s.code,
    s.name,
    s.description ?? "",
    s.analysisCode,
    s.suffix,
    s.entryRule,
    JSON.stringify(s.entryParams),
    s.exitTargetType,
    String(s.exitTargetValue),
    s.stopLossType,
    String(s.stopLossValue),
    String(s.isStandard),
  ])
  return header + "\n" + data + "\n"
}

export function parseStrategyCsv(content: string): ParseResult<ParsedStrategy> {
  const lines = splitLines(content)
  if (lines.length < 2) return { error: "CSV debe tener al menos 2 líneas (cabecera + datos)" }

  const headers = parseCsvRow(lines[0])
  const expected = [...STRATEGY_HEADERS]
  for (const h of expected) {
    if (!headers.includes(h)) return { error: `Columna faltante: "${h}"` }
  }

  const values = parseCsvRow(lines[1])
  const idx = (name: string) => headers.indexOf(name)

  const code = values[idx("code")]?.trim()
  if (!code) return { error: "Campo 'code' vacío" }

  const name = values[idx("name")]?.trim()
  if (!name) return { error: "Campo 'name' vacío" }

  const analysisCode = values[idx("analysisCode")]?.trim()
  if (!analysisCode) return { error: "Campo 'analysisCode' vacío" }

  const entryParamsRaw = values[idx("entryParams")]?.trim()
  let entryParams: object = {}
  try {
    entryParams = JSON.parse(entryParamsRaw || "{}")
  } catch {
    return { error: `Campo 'entryParams' contiene JSON inválido: ${entryParamsRaw?.slice(0, 40)}` }
  }

  const exitTargetValue = parseFloat(values[idx("exitTargetValue")] ?? "0")
  const stopLossValue = parseFloat(values[idx("stopLossValue")] ?? "0")
  if (isNaN(exitTargetValue)) return { error: "Campo 'exitTargetValue' no es un número válido" }
  if (isNaN(stopLossValue)) return { error: "Campo 'stopLossValue' no es un número válido" }

  return {
    ok: {
      code,
      name,
      description: values[idx("description")]?.trim() ?? "",
      analysisCode,
      suffix: values[idx("suffix")]?.trim() ?? "",
      entryRule: values[idx("entryRule")]?.trim() ?? "",
      entryParams,
      exitTargetType: values[idx("exitTargetType")]?.trim() ?? "",
      exitTargetValue,
      stopLossType: values[idx("stopLossType")]?.trim() ?? "",
      stopLossValue,
      isStandard: values[idx("isStandard")]?.trim().toLowerCase() === "true",
    },
  }
}

/** Infer file type from filename. */
export function inferCsvType(filename: string): "analysis" | "strategy" | "unknown" {
  const base = filename.toLowerCase()
  if (base.startsWith("analysis_") && base.endsWith(".csv")) return "analysis"
  if (base.startsWith("strategy_") && base.endsWith(".csv")) return "strategy"
  return "unknown"
}
