"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createStrategy, updateStrategy, type StrategyInput } from "@/actions/strategies"

// ---- Types ----

type Suffix = "LONG" | "SHORT" | "BNC" | "UP" | "DN"
type EntryRule = "EMA_CROSS_UP" | "EMA_CROSS_DOWN" | "RSI_OVERSOLD_BB_LOWER" | "BB_BREAKOUT_UP_VOLUME" | "BB_BREAKOUT_DOWN_VOLUME" | "EMA_STOCH_CROSS" | "VWAP_DEVIATION_RSI"
type ExitType = "PERCENT_GAIN" | "BOLLINGER_MIDDLE" | "VWAP_TOUCH"
type SLType = "PERCENT" | "BOLLINGER_MIDDLE"

const SUFFIX_LABELS: Record<Suffix, string> = {
  LONG: "LONG — Tendencia alcista", SHORT: "SHORT — Tendencia bajista",
  BNC: "BNC — Rebote", UP: "UP — Ruptura al alza", DN: "DN — Ruptura a la baja",
}

const ENTRY_LABELS: Record<EntryRule, string> = {
  EMA_CROSS_UP: "EMA cruce al alza",
  EMA_CROSS_DOWN: "EMA cruce a la baja",
  RSI_OVERSOLD_BB_LOWER: "RSI sobreventa + BB inferior",
  BB_BREAKOUT_UP_VOLUME: "Ruptura BB superior con volumen",
  BB_BREAKOUT_DOWN_VOLUME: "Ruptura BB inferior con volumen",
  EMA_STOCH_CROSS: "EMA + Estocástico cruce",
  VWAP_DEVIATION_RSI: "Desviación VWAP + RSI",
}

const ENTRY_PARAMS: Record<EntryRule, { key: string; label: string; type: "number" | "boolean" }[]> = {
  EMA_CROSS_UP: [{ key: "ema_fast", label: "EMA rápida", type: "number" }, { key: "ema_slow", label: "EMA lenta", type: "number" }],
  EMA_CROSS_DOWN: [{ key: "ema_fast", label: "EMA rápida", type: "number" }, { key: "ema_slow", label: "EMA lenta", type: "number" }],
  RSI_OVERSOLD_BB_LOWER: [{ key: "rsi_threshold", label: "Umbral RSI", type: "number" }, { key: "bb_period", label: "Periodo BB", type: "number" }],
  BB_BREAKOUT_UP_VOLUME: [{ key: "bb_period", label: "Periodo BB", type: "number" }, { key: "volume_multiplier", label: "Multiplicador vol.", type: "number" }],
  BB_BREAKOUT_DOWN_VOLUME: [{ key: "bb_period", label: "Periodo BB", type: "number" }, { key: "volume_multiplier", label: "Multiplicador vol.", type: "number" }],
  EMA_STOCH_CROSS: [{ key: "ema_period", label: "Periodo EMA", type: "number" }, { key: "stoch_oversold", label: "Sobreventa Stoch", type: "number" }],
  VWAP_DEVIATION_RSI: [{ key: "vwap_deviation_pct", label: "Desviación VWAP %", type: "number" }, { key: "rsi_threshold", label: "Umbral RSI", type: "number" }],
}

const EXIT_LABELS: Record<ExitType, string> = {
  PERCENT_GAIN: "% de ganancia",
  BOLLINGER_MIDDLE: "Media Bollinger",
  VWAP_TOUCH: "Toque VWAP",
}

const SL_LABELS: Record<SLType, string> = {
  PERCENT: "% de pérdida",
  BOLLINGER_MIDDLE: "Media Bollinger",
}

const DEFAULT_ENTRY_PARAMS: Record<EntryRule, Record<string, number>> = {
  EMA_CROSS_UP: { ema_fast: 20, ema_slow: 50 },
  EMA_CROSS_DOWN: { ema_fast: 20, ema_slow: 50 },
  RSI_OVERSOLD_BB_LOWER: { rsi_threshold: 30, bb_period: 20 },
  BB_BREAKOUT_UP_VOLUME: { bb_period: 20, volume_multiplier: 1.5 },
  BB_BREAKOUT_DOWN_VOLUME: { bb_period: 20, volume_multiplier: 1.5 },
  EMA_STOCH_CROSS: { ema_period: 9, stoch_oversold: 20 },
  VWAP_DEVIATION_RSI: { vwap_deviation_pct: 1, rsi_threshold: 40 },
}

interface Analysis { id: string; name: string; code: string | null }

interface StrategyData {
  id: string
  name: string
  description: string | null
  analysisId: string
  suffix: string
  entryRule: string
  entryParams: Record<string, unknown>
  exitTargetType: string
  exitTargetValue: number
  stopLossType: string
  stopLossValue: number
}

interface Props {
  analyses: Analysis[]
  strategy?: StrategyData | null
}

export function StrategyEditor({ analyses, strategy }: Props) {
  const isNew = !strategy
  const [name, setName] = useState(strategy?.name ?? "")
  const [description, setDescription] = useState(strategy?.description ?? "")
  const [analysisId, setAnalysisId] = useState(strategy?.analysisId ?? (analyses[0]?.id ?? ""))
  const [suffix, setSuffix] = useState<Suffix>((strategy?.suffix as Suffix) ?? "LONG")
  const [entryRule, setEntryRule] = useState<EntryRule>((strategy?.entryRule as EntryRule) ?? "EMA_CROSS_UP")
  const [entryParams, setEntryParams] = useState<Record<string, number>>(
    (strategy?.entryParams as Record<string, number>) ?? { ...DEFAULT_ENTRY_PARAMS.EMA_CROSS_UP }
  )
  const [exitType, setExitType] = useState<ExitType>((strategy?.exitTargetType as ExitType) ?? "PERCENT_GAIN")
  const [exitValue, setExitValue] = useState(strategy?.exitTargetValue ?? 3)
  const [slType, setSLType] = useState<SLType>((strategy?.stopLossType as SLType) ?? "PERCENT")
  const [slValue, setSLValue] = useState(strategy?.stopLossValue ?? 1.5)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleEntryRuleChange = (rule: EntryRule) => {
    setEntryRule(rule)
    setEntryParams({ ...DEFAULT_ENTRY_PARAMS[rule] })
  }

  const handleSubmit = () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return }
    if (!analysisId) { setError("Debes seleccionar un análisis"); return }
    setError(null)

    const input: StrategyInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      analysisId,
      suffix,
      entryRule,
      entryParams,
      exitTargetType: exitType,
      exitTargetValue: exitValue,
      stopLossType: slType,
      stopLossValue: slValue,
    }

    startTransition(async () => {
      try {
        if (strategy?.id) await updateStrategy(strategy.id, input)
        else await createStrategy(input)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error guardando estrategia")
      }
    })
  }

  const selectedAnalysis = analyses.find((a) => a.id === analysisId)
  const previewCode = selectedAnalysis?.code ? `${selectedAnalysis.code}-${suffix}` : `???-${suffix}`

  return (
    <div className="max-w-2xl space-y-6">
      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Code preview */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-500">Código generado</p>
        <p className="font-mono text-xl font-bold text-slate-900">{previewCode}</p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">Nombre <span className="text-red-500">*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre legible único..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">Descripción</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      {/* Analysis + Suffix */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Análisis base</label>
          <select value={analysisId} onChange={(e) => setAnalysisId(e.target.value)}
            disabled={!isNew}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none disabled:bg-slate-50">
            {analyses.map((a) => (
              <option key={a.id} value={a.id}>{a.code ? `[${a.code}] ` : ""}{a.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Sufijo</label>
          <select value={suffix} onChange={(e) => setSuffix(e.target.value as Suffix)}
            disabled={!isNew}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none disabled:bg-slate-50">
            {(Object.keys(SUFFIX_LABELS) as Suffix[]).map((s) => (
              <option key={s} value={s}>{SUFFIX_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Entry rule */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Regla de entrada</label>
        <select value={entryRule} onChange={(e) => handleEntryRuleChange(e.target.value as EntryRule)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none">
          {(Object.keys(ENTRY_LABELS) as EntryRule[]).map((r) => (
            <option key={r} value={r}>{ENTRY_LABELS[r]}</option>
          ))}
        </select>
        {/* Dynamic params */}
        <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {ENTRY_PARAMS[entryRule].map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{p.label}</span>
              <input type="number" min={0} step={p.key.includes("multiplier") ? 0.1 : 1}
                value={entryParams[p.key] ?? 0}
                onChange={(e) => setEntryParams((prev) => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))}
                className="w-16 rounded border border-slate-300 px-2 py-0.5 text-sm focus:outline-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Exit target */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Objetivo de salida</label>
          <select value={exitType} onChange={(e) => setExitType(e.target.value as ExitType)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none">
            {(Object.keys(EXIT_LABELS) as ExitType[]).map((t) => (
              <option key={t} value={t}>{EXIT_LABELS[t]}</option>
            ))}
          </select>
        </div>
        {exitType === "PERCENT_GAIN" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">% objetivo</label>
            <input type="number" min={0} step={0.5} value={exitValue}
              onChange={(e) => setExitValue(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none" />
          </div>
        )}
      </div>

      {/* Stop loss */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Stop loss</label>
          <select value={slType} onChange={(e) => setSLType(e.target.value as SLType)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none">
            {(Object.keys(SL_LABELS) as SLType[]).map((t) => (
              <option key={t} value={t}>{SL_LABELS[t]}</option>
            ))}
          </select>
        </div>
        {slType === "PERCENT" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">% stop</label>
            <input type="number" min={0} step={0.25} value={slValue}
              onChange={(e) => setSLValue(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={handleSubmit} disabled={pending}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {pending ? "Guardando…" : isNew ? "Crear estrategia" : "Guardar cambios"}
        </button>
        <button type="button" onClick={() => router.push("/app/playbook/strategies")}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </div>
  )
}
