/**
 * Shared helpers for building export data from DB records.
 * Returns CSV strings ready for download or ZIP packaging.
 */

import { serializeAnalysisToCsv, serializeStrategyToCsv } from "./csv-codec"
import type { SerializableAnalysis, SerializableStrategy } from "./csv-codec"

export interface AnalysisExportRow {
  id: string
  code: string | null
  name: string
  descripcion: string | null
  bias: string
  isStandard: boolean
  indicators: object[]
}

export interface StrategyExportRow {
  id: string
  code: string
  name: string
  description: string | null
  suffix: string
  entryRule: string
  entryParams: object
  exitTargetType: string
  exitTargetValue: number
  stopLossType: string
  stopLossValue: number
  isStandard: boolean
  analysis: { code: string | null }
}

export function analysisToFilename(code: string | null, name: string): string {
  const safe = (code ?? name).replace(/[^a-zA-Z0-9_-]/g, "_")
  return `analysis_${safe}.csv`
}

export function strategyToFilename(code: string): string {
  const safe = code.replace(/[^a-zA-Z0-9_-]/g, "_")
  return `strategy_${safe}.csv`
}

export function buildAnalysisCsv(row: AnalysisExportRow): string {
  const a: SerializableAnalysis = {
    code: row.code ?? row.name.replace(/\s+/g, "_").toUpperCase().slice(0, 3),
    name: row.name,
    descripcion: row.descripcion,
    bias: row.bias,
    isStandard: row.isStandard,
    indicators: row.indicators,
  }
  return serializeAnalysisToCsv(a)
}

export function buildStrategyCsv(row: StrategyExportRow): string {
  const s: SerializableStrategy = {
    code: row.code,
    name: row.name,
    description: row.description,
    analysisCode: row.analysis.code ?? "",
    suffix: row.suffix,
    entryRule: row.entryRule,
    entryParams: row.entryParams,
    exitTargetType: row.exitTargetType,
    exitTargetValue: row.exitTargetValue,
    stopLossType: row.stopLossType,
    stopLossValue: row.stopLossValue,
    isStandard: row.isStandard,
  }
  return serializeStrategyToCsv(s)
}

/** Select fields needed for export queries. */
export const ANALYSIS_EXPORT_SELECT = {
  id: true, code: true, name: true, descripcion: true, bias: true, isStandard: true,
  indicators: {
    orderBy: { pane: "asc" as const },
    select: { localId: true, type: true, params: true, color: true, lineWidth: true, lineStyle: true, pane: true },
  },
} as const

export const STRATEGY_EXPORT_SELECT = {
  id: true, code: true, name: true, description: true,
  suffix: true, entryRule: true, entryParams: true,
  exitTargetType: true, exitTargetValue: true,
  stopLossType: true, stopLossValue: true, isStandard: true,
  analysis: { select: { code: true } },
} as const
