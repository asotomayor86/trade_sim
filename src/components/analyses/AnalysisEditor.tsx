"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createAnalysis, updateAnalysis } from "@/actions/analyses"
import {
  INDICATOR_DEFAULTS, INDICATOR_PANEL, autoColor,
  type IndicatorTipo,
} from "@/lib/indicators/engine"

// ---- Constants ----

const ALL_TIPOS: IndicatorTipo[] = ["SMA", "EMA", "BB", "VWAP", "RSI", "MACD", "STOCH", "VOL"]

const TIPO_LABELS: Record<IndicatorTipo, string> = {
  SMA: "SMA", EMA: "EMA", BB: "Bollinger", VWAP: "VWAP",
  RSI: "RSI", MACD: "MACD", STOCH: "Estocástico", VOL: "Volumen",
}

const PARAM_LABELS: Record<string, Record<string, string>> = {
  SMA:   { periodo: "Periodo" },
  EMA:   { periodo: "Periodo" },
  BB:    { periodo: "Periodo", desviaciones: "Desviaciones" },
  VWAP:  { periodo_reset: "Reset" },
  RSI:   { periodo: "Periodo", nivel_sobrecompra: "Sobrecompra", nivel_sobreventa: "Sobreventa" },
  MACD:  { periodo_rapida: "Rápida", periodo_lenta: "Lenta", "periodo_señal": "Señal" },
  STOCH: { periodo_k: "%K", periodo_d: "%D", suavizado: "Suavizado", nivel_sobrecompra: "Sobrecompra", nivel_sobreventa: "Sobreventa" },
  VOL:   { mostrar_media: "Media", periodo_media: "Periodo media" },
}

const VWAP_RESETS = ["sesion", "diario", "semanal"] as const

// ---- Standalone editor type (no extends to avoid field collisions) ----

interface EditorIndicator {
  localId: string
  tipo: IndicatorTipo
  params: Record<string, unknown>
  color: string
  lineWidth: number
  lineStyle: number
  panel: "overlay" | "sub"
}

interface AnalysisData {
  id: string
  name: string
  descripcion: string | null
  indicators: {
    localId: string
    type: string
    params: Record<string, unknown>
    color: string | null
    lineWidth: number
    lineStyle: number
    pane: number
  }[]
}

interface Props {
  analysis?: AnalysisData | null
}

// ---- Validation ----

function validateIndicators(indicators: EditorIndicator[]): string | null {
  for (const ind of indicators) {
    if (ind.tipo === "MACD") {
      const fast = Number(ind.params.periodo_rapida ?? 0)
      const slow = Number(ind.params.periodo_lenta ?? 0)
      if (slow <= fast) return `MACD: periodo lenta (${slow}) debe ser mayor que rápida (${fast})`
    }
    if (ind.tipo === "RSI" || ind.tipo === "STOCH") {
      const ob = Number(ind.params.nivel_sobrecompra ?? 0)
      const os = Number(ind.params.nivel_sobreventa ?? 0)
      if (ob <= os) return `${ind.tipo}: sobrecompra debe ser mayor que sobreventa`
    }
    if (ind.tipo === "BB") {
      const dev = Number(ind.params.desviaciones ?? 0)
      if (dev < 0.5 || dev > 5) return "Bollinger: desviaciones debe estar entre 0.5 y 5"
    }
  }
  return null
}

// ---- ParamField sub-component ----

function ParamField({
  tipo, paramKey, value, onChange,
}: {
  tipo: IndicatorTipo
  paramKey: string
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = PARAM_LABELS[tipo]?.[paramKey] ?? paramKey

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`h-4 w-8 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-slate-600"}`}
        >
          <span className={`block h-3 w-3 rounded-full bg-white transition-transform mx-0.5 ${value ? "translate-x-4" : ""}`} />
        </button>
      </div>
    )
  }

  if (paramKey === "periodo_reset") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {VWAP_RESETS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type="number"
        value={Number(value)}
        min={1}
        step={paramKey === "desviaciones" ? 0.5 : 1}
        onChange={(e) =>
          onChange(paramKey === "desviaciones" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
        }
        className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

// ---- Main component ----

export function AnalysisEditor({ analysis }: Props) {
  const isNew = !analysis
  const [name, setName] = useState(analysis?.name ?? "")
  const [descripcion, setDescripcion] = useState(analysis?.descripcion ?? "")
  const [indicators, setIndicators] = useState<EditorIndicator[]>(() =>
    (analysis?.indicators ?? []).map((i, idx) => ({
      localId: i.localId,
      tipo: i.type as IndicatorTipo,
      params: i.params,
      color: i.color ?? autoColor(idx),
      lineWidth: i.lineWidth,
      lineStyle: i.lineStyle,
      panel: i.pane === 0 ? "overlay" : "sub",
    }))
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // ---- Indicator helpers ----

  const addIndicator = (tipo: IndicatorTipo) => {
    setIndicators((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        tipo,
        params: { ...INDICATOR_DEFAULTS[tipo] },
        color: autoColor(prev.length),
        lineWidth: 1,
        lineStyle: 0,
        panel: INDICATOR_PANEL[tipo],
      },
    ])
  }

  const removeIndicator = (localId: string) =>
    setIndicators((prev) => prev.filter((i) => i.localId !== localId))

  const updateParam = (localId: string, key: string, value: unknown) =>
    setIndicators((prev) =>
      prev.map((i) =>
        i.localId === localId ? { ...i, params: { ...i.params, [key]: value } } : i
      )
    )

  const updateColor = (localId: string, color: string) =>
    setIndicators((prev) => prev.map((i) => (i.localId === localId ? { ...i, color } : i)))

  // ---- Submit ----

  const handleSubmit = () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return }
    const validErr = validateIndicators(indicators)
    if (validErr) { setError(validErr); return }
    setError(null)

    const input = {
      name: name.trim(),
      descripcion: descripcion.trim() || undefined,
      indicators: indicators.map((i) => ({
        localId: i.localId,
        type: i.tipo,
        params: i.params,
        color: i.color,
        lineWidth: i.lineWidth,
        lineStyle: i.lineStyle,
        pane: i.panel === "overlay" ? 0 : 1,
      })),
    }

    startTransition(async () => {
      try {
        if (analysis?.id) await updateAnalysis(analysis.id, input)
        else await createAnalysis(input)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error guardando análisis")
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre único del análisis…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción opcional…"
          rows={2}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Indicators */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Indicadores{" "}
          <span className="font-normal text-slate-400">({indicators.length})</span>
        </label>

        {indicators.length === 0 && (
          <p className="text-sm text-slate-400">Sin indicadores. Añade al menos uno.</p>
        )}

        <div className="space-y-2">
          {indicators.map((ind) => (
            <div key={ind.localId} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              {/* Header row */}
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  ind.panel === "overlay"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}>
                  {TIPO_LABELS[ind.tipo]}
                </span>
                <span className="text-xs text-slate-400">{ind.panel}</span>

                <label className="ml-auto flex cursor-pointer items-center gap-1.5">
                  <span className="text-xs text-slate-500">Color</span>
                  <input
                    type="color"
                    value={ind.color}
                    onChange={(e) => updateColor(ind.localId, e.target.value)}
                    className="h-5 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeIndicator(ind.localId)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>

              {/* Params row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {Object.entries(ind.params).map(([key, val]) => {
                  if (key === "periodo_media" && ind.params.mostrar_media === false) return null
                  return (
                    <ParamField
                      key={key}
                      tipo={ind.tipo}
                      paramKey={key}
                      value={val}
                      onChange={(v) => updateParam(ind.localId, key, v)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Add buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {ALL_TIPOS.map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => addIndicator(tipo)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            >
              + {TIPO_LABELS[tipo]}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Guardando…" : isNew ? "Crear análisis" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/app/analyses")}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
