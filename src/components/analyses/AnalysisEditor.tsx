"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createAnalysis, updateAnalysis, type IndicatorInput, type RuleInput, type AnalysisInput } from "@/actions/analyses"
import { generateAnalysisName, type Bias } from "@/lib/analyses/naming"

// ---- Types ----
type IndicatorType = "EMA" | "SMA" | "RSI" | "MACD" | "BOLLINGER" | "ATR" | "ADX" | "DONCHIAN" | "VOLUME"
type RuleType = "ENTRY" | "EXIT_TP" | "EXIT_SL"

const INDICATOR_DEFAULTS: Record<IndicatorType, Record<string, number>> = {
  EMA: { period: 20 }, SMA: { period: 50 }, RSI: { period: 14 },
  MACD: { fast: 12, slow: 26, signal: 9 },
  BOLLINGER: { period: 20, stdDev: 2 },
  ATR: { period: 14 }, ADX: { period: 14 }, DONCHIAN: { period: 20 }, VOLUME: {},
}

const INDICATOR_PANE: Record<IndicatorType, number> = {
  EMA: 0, SMA: 0, BOLLINGER: 0, DONCHIAN: 0,
  VOLUME: 1, RSI: 2, MACD: 3, ATR: 2, ADX: 2,
}

interface AnalysisData {
  id: string
  name: string
  nameCustom: boolean
  bias: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  indicators: { type: string; params: any; color: string | null; pane: number }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules: { type: string; direction: string | null; description: string | null; condition: any }[]
}

interface Props {
  analysis?: AnalysisData | null
  readonlyData?: AnalysisData | null
}

function ParamField({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-16">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

export function AnalysisEditor({ analysis, readonlyData }: Props) {
  const isNew = !analysis && !readonlyData
  const data = analysis ?? readonlyData
  const readonly = !!readonlyData

  const [bias, setBias] = useState<Bias>((data?.bias as Bias) ?? "BULLISH")
  const [nameCustom, setNameCustom] = useState(data?.nameCustom ?? false)
  const [name, setName] = useState(data?.name ?? "")
  const [indicators, setIndicators] = useState<IndicatorInput[]>(
    (data?.indicators ?? []).map((i) => ({
      type: i.type,
      params: i.params as Record<string, number>,
      color: i.color ?? undefined,
      pane: i.pane,
    }))
  )
  const [rules, setRules] = useState<RuleInput[]>(
    (data?.rules ?? []).map((r) => ({
      type: r.type as RuleType,
      direction: r.direction as "LONG" | "SHORT" | null,
      description: r.description ?? "",
      condition: r.condition as Record<string, unknown>,
    }))
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Auto-generate name when not custom
  useEffect(() => {
    if (nameCustom) return
    const trigger = rules.find((r) => r.type === "ENTRY")?.description ?? ""
    const generated = generateAnalysisName(bias, indicators as import("@/lib/analyses/naming").IndicatorCfg[], trigger)
    setName(generated)
  }, [bias, indicators, rules, nameCustom])

  // ---- Indicator helpers ----
  const addIndicator = (type: IndicatorType) => {
    setIndicators((prev) => [
      ...prev,
      { type, params: { ...INDICATOR_DEFAULTS[type] }, pane: INDICATOR_PANE[type] },
    ])
  }

  const removeIndicator = (idx: number) => setIndicators((prev) => prev.filter((_, i) => i !== idx))

  const updateIndicatorParam = (idx: number, key: string, value: number) =>
    setIndicators((prev) =>
      prev.map((ind, i) => i === idx ? { ...ind, params: { ...ind.params, [key]: value } } : ind)
    )

  // ---- Rule helpers ----
  const addRule = (type: RuleType) =>
    setRules((prev) => [...prev, { type, direction: null, description: "", condition: {} }])

  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx))

  const updateRule = (idx: number, patch: Partial<RuleInput>) =>
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))

  // ---- Submit ----
  const handleSubmit = () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return }
    const input: AnalysisInput = { name, nameCustom, bias, indicators, rules }

    startTransition(async () => {
      try {
        if (analysis?.id) await updateAnalysis(analysis.id, input)
        else await createAnalysis(input)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error guardando análisis")
      }
    })
  }

  // ---- Available indicators to add (excluding already added types for uniqueness where needed) ----
  const ALL_TYPES: IndicatorType[] = ["EMA", "SMA", "RSI", "MACD", "BOLLINGER", "ATR", "ADX", "DONCHIAN", "VOLUME"]

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Nombre del análisis</label>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameCustom(true) }}
            onBlur={() => { if (!name.trim()) setNameCustom(false) }}
            disabled={readonly}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
          />
          {!readonly && nameCustom && (
            <button
              onClick={() => setNameCustom(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
              title="Regenerar nombre automático"
            >
              ↺ Auto
            </button>
          )}
        </div>
        {!nameCustom && !readonly && (
          <p className="text-xs text-slate-400">Nombre generado automáticamente. Edítalo para personalizarlo.</p>
        )}
      </div>

      {/* Bias */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Sesgo</label>
        <div className="flex gap-2">
          {(["BULLISH", "BEARISH", "NEUTRAL"] as Bias[]).map((b) => (
            <button
              key={b}
              disabled={readonly}
              onClick={() => !readonly && setBias(b)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                bias === b
                  ? b === "BULLISH" ? "bg-green-600 text-white"
                    : b === "BEARISH" ? "bg-red-600 text-white"
                    : "bg-slate-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:cursor-default`}
            >
              {b === "BULLISH" ? "Alcista" : b === "BEARISH" ? "Bajista" : "Neutro"}
            </button>
          ))}
        </div>
      </div>

      {/* Indicators */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Indicadores</label>

        {indicators.length === 0 && (
          <p className="text-sm text-slate-400">Sin indicadores. Añade al menos uno.</p>
        )}

        <div className="space-y-2">
          {indicators.map((ind, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-mono text-sm font-semibold text-slate-700 w-20">{ind.type}</span>
              {Object.entries(ind.params).map(([k, v]) => (
                <ParamField
                  key={k}
                  label={k}
                  value={v as number}
                  onChange={(val) => !readonly && updateIndicatorParam(idx, k, val)}
                />
              ))}
              {!readonly && (
                <button onClick={() => removeIndicator(idx)} className="ml-auto text-xs text-red-500 hover:text-red-700">
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>

        {!readonly && (
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => addIndicator(t)}
                className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                + {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Reglas</label>

        {rules.length === 0 && (
          <p className="text-sm text-slate-400">Sin reglas definidas.</p>
        )}

        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  rule.type === "ENTRY" ? "bg-blue-100 text-blue-700"
                  : rule.type === "EXIT_TP" ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                }`}>
                  {rule.type === "ENTRY" ? "Entrada" : rule.type === "EXIT_TP" ? "TP" : "SL"}
                </span>

                <select
                  value={rule.direction ?? "BOTH"}
                  disabled={readonly}
                  onChange={(e) => updateRule(idx, { direction: e.target.value === "BOTH" ? null : e.target.value as "LONG" | "SHORT" })}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs focus:outline-none disabled:bg-transparent"
                >
                  <option value="BOTH">Ambas</option>
                  <option value="LONG">Largo</option>
                  <option value="SHORT">Corto</option>
                </select>

                {!readonly && (
                  <button onClick={() => removeRule(idx)} className="ml-auto text-xs text-red-500 hover:text-red-700">
                    Quitar
                  </button>
                )}
              </div>

              <input
                value={rule.description}
                disabled={readonly}
                onChange={(e) => updateRule(idx, { description: e.target.value })}
                placeholder="Descripción de la condición..."
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent"
              />
            </div>
          ))}
        </div>

        {!readonly && (
          <div className="flex gap-2">
            <button onClick={() => addRule("ENTRY")} className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100">
              + Entrada
            </button>
            <button onClick={() => addRule("EXIT_TP")} className="rounded bg-green-50 px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-100">
              + TP
            </button>
            <button onClick={() => addRule("EXIT_SL")} className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
              + SL
            </button>
          </div>
        )}
      </div>

      {/* Submit */}
      {!readonly && (
        <div className="flex gap-3 pt-2 border-t border-slate-200">
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {pending ? "Guardando…" : analysis ? "Guardar cambios" : "Crear análisis"}
          </button>
          <button
            onClick={() => router.push("/app/analyses")}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
