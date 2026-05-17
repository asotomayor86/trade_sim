/**
 * Pure validation logic for import preview.
 * No DB access — all DB state is passed in as arguments.
 */

import { parseAnalysisCsv, parseStrategyCsv, inferCsvType } from "./csv-codec"
import type { ParsedAnalysis, ParsedStrategy } from "./csv-codec"

const MAX_ANALYSES = 15

export interface ImportFile {
  filename: string
  content: string
}

export interface AnalysisImportRow {
  filename: string
  parsed: ParsedAnalysis
  action: "create" | "skip"
  skipReason?: string
}

export interface StrategyImportRow {
  filename: string
  parsed: ParsedStrategy
  action: "create" | "skip"
  skipReason?: string
}

export interface ImportError {
  filename: string
  message: string
}

export interface ImportPreview {
  analysesToCreate: AnalysisImportRow[]
  analysesToSkip: AnalysisImportRow[]
  strategiesToCreate: StrategyImportRow[]
  strategiesToSkip: StrategyImportRow[]
  errors: ImportError[]
  limitError: string | null
}

export function buildImportPreview(
  files: ImportFile[],
  existingAnalysisCodes: Set<string>,
  existingStrategyCodes: Set<string>,
  currentAnalysisCount: number,
): ImportPreview {
  const analysesToCreate: AnalysisImportRow[] = []
  const analysesToSkip: AnalysisImportRow[] = []
  const strategiesToCreate: StrategyImportRow[] = []
  const strategiesToSkip: StrategyImportRow[] = []
  const errors: ImportError[] = []

  // Track codes seen in this batch (for FK validation within the lote)
  const batchAnalysisCodes = new Set<string>()

  // ---- Parse analyses first ----
  for (const file of files) {
    const type = inferCsvType(file.filename)
    if (type !== "analysis") continue

    const result = parseAnalysisCsv(file.content)
    if ("error" in result) {
      errors.push({ filename: file.filename, message: result.error })
      continue
    }

    const parsed = result.ok
    if (existingAnalysisCodes.has(parsed.code)) {
      analysesToSkip.push({ filename: file.filename, parsed, action: "skip", skipReason: "code ya existe en BD" })
    } else if (batchAnalysisCodes.has(parsed.code)) {
      analysesToSkip.push({ filename: file.filename, parsed, action: "skip", skipReason: "code duplicado en el lote" })
    } else {
      batchAnalysisCodes.add(parsed.code)
      analysesToCreate.push({ filename: file.filename, parsed, action: "create" })
    }
  }

  // ---- Check limit before processing strategies ----
  const newAnalysesCount = analysesToCreate.length
  const projectedTotal = currentAnalysisCount + newAnalysesCount
  let limitError: string | null = null
  if (projectedTotal > MAX_ANALYSES) {
    const available = MAX_ANALYSES - currentAnalysisCount
    limitError = `Límite de ${MAX_ANALYSES} análisis superado. Hay ${available} hueco${available !== 1 ? "s" : ""} disponible${available !== 1 ? "s" : ""} y el lote añadiría ${newAnalysesCount}.`
  }

  // ---- Parse strategies ----
  const allKnownAnalysisCodes = new Set([...existingAnalysisCodes, ...batchAnalysisCodes])

  for (const file of files) {
    const type = inferCsvType(file.filename)
    if (type !== "strategy") continue

    const result = parseStrategyCsv(file.content)
    if ("error" in result) {
      errors.push({ filename: file.filename, message: result.error })
      continue
    }

    const parsed = result.ok

    // FK check
    if (!allKnownAnalysisCodes.has(parsed.analysisCode)) {
      errors.push({
        filename: file.filename,
        message: `analysisCode "${parsed.analysisCode}" no existe en BD ni en el lote`,
      })
      continue
    }

    if (existingStrategyCodes.has(parsed.code)) {
      strategiesToSkip.push({ filename: file.filename, parsed, action: "skip", skipReason: "code ya existe en BD" })
    } else {
      strategiesToCreate.push({ filename: file.filename, parsed, action: "create" })
    }
  }

  // ---- Unknown file types ----
  for (const file of files) {
    if (inferCsvType(file.filename) === "unknown") {
      errors.push({ filename: file.filename, message: "Nombre de archivo no reconocido (debe empezar por analysis_ o strategy_)" })
    }
  }

  return { analysesToCreate, analysesToSkip, strategiesToCreate, strategiesToSkip, errors, limitError }
}
