"use client"

import { useState } from "react"

export interface IndicatorState {
  ema: { enabled: boolean; period: number; color: string }
  ema2: { enabled: boolean; period: number; color: string }
  sma: { enabled: boolean; period: number; color: string }
  bollinger: { enabled: boolean; period: number; stdDev: number }
  donchian: { enabled: boolean; period: number }
  rsi: { enabled: boolean; period: number }
  macd: { enabled: boolean; fast: number; slow: number; signal: number }
  atr: { enabled: boolean; period: number }
  adx: { enabled: boolean; period: number }
  volume: { enabled: boolean; smaEnabled: boolean; smaPeriod: number }
}

export const DEFAULT_INDICATORS: IndicatorState = {
  ema: { enabled: false, period: 20, color: "#f59e0b" },
  ema2: { enabled: false, period: 50, color: "#3b82f6" },
  sma: { enabled: false, period: 200, color: "#a855f7" },
  bollinger: { enabled: false, period: 20, stdDev: 2 },
  donchian: { enabled: false, period: 20 },
  rsi: { enabled: false, period: 14 },
  macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
  atr: { enabled: false, period: 14 },
  adx: { enabled: false, period: 14 },
  volume: { enabled: true, smaEnabled: false, smaPeriod: 20 },
}

interface RowProps {
  label: string
  enabled: boolean
  onToggle: () => void
  children?: React.ReactNode
}

function Row({ label, enabled, onToggle, children }: RowProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-800 last:border-0">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          {children && enabled && (
            <button onClick={() => setOpen((v) => !v)} className="text-xs text-slate-500 hover:text-slate-300">
              {open ? "▲" : "▼"}
            </button>
          )}
          <button
            onClick={onToggle}
            className={`h-5 w-9 rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-slate-700"}`}
          >
            <span className={`block h-4 w-4 rounded-full bg-white transition-transform mx-0.5 ${enabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>
      </div>
      {open && enabled && children && (
        <div className="px-3 pb-3 text-xs text-slate-400">{children}</div>
      )}
    </div>
  )
}

function NumInput({ label, value, onChange, min = 1, max = 500 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 mt-1">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-16 rounded bg-slate-800 px-2 py-0.5 text-right text-slate-200 focus:outline-none"
      />
    </div>
  )
}

interface Props {
  state: IndicatorState
  onChange: (s: IndicatorState) => void
}

export function IndicatorPanel({ state, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const set = <K extends keyof IndicatorState>(key: K, val: Partial<IndicatorState[K]>) =>
    onChange({ ...state, [key]: { ...state[key], ...val } })

  const toggle = (key: keyof IndicatorState) =>
    set(key, { enabled: !(state[key] as { enabled: boolean }).enabled } as Partial<IndicatorState[typeof key]>)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
      >
        Indicadores
        {Object.values(state).filter((v) => v.enabled).length > 0 && (
          <span className="rounded-full bg-blue-600 px-1.5 text-xs text-white">
            {Object.values(state).filter((v) => v.enabled).length}
          </span>
        )}
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <p className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Indicadores
            </p>

            <Row label="Volumen" enabled={state.volume.enabled} onToggle={() => toggle("volume")}>
              <NumInput label="SMA Volumen" value={state.volume.smaPeriod} onChange={(v) => set("volume", { smaPeriod: v })} />
            </Row>

            <Row label="EMA (rápida)" enabled={state.ema.enabled} onToggle={() => toggle("ema")}>
              <NumInput label="Periodo" value={state.ema.period} onChange={(v) => set("ema", { period: v })} />
            </Row>

            <Row label="EMA (lenta)" enabled={state.ema2.enabled} onToggle={() => toggle("ema2")}>
              <NumInput label="Periodo" value={state.ema2.period} onChange={(v) => set("ema2", { period: v })} />
            </Row>

            <Row label="SMA" enabled={state.sma.enabled} onToggle={() => toggle("sma")}>
              <NumInput label="Periodo" value={state.sma.period} onChange={(v) => set("sma", { period: v })} />
            </Row>

            <Row label="Bollinger" enabled={state.bollinger.enabled} onToggle={() => toggle("bollinger")}>
              <NumInput label="Periodo" value={state.bollinger.period} onChange={(v) => set("bollinger", { period: v })} />
              <NumInput label="Desv. estándar" value={state.bollinger.stdDev} onChange={(v) => set("bollinger", { stdDev: v })} min={1} max={5} />
            </Row>

            <Row label="Donchian" enabled={state.donchian.enabled} onToggle={() => toggle("donchian")}>
              <NumInput label="Periodo" value={state.donchian.period} onChange={(v) => set("donchian", { period: v })} />
            </Row>

            <Row label="RSI" enabled={state.rsi.enabled} onToggle={() => toggle("rsi")}>
              <NumInput label="Periodo" value={state.rsi.period} onChange={(v) => set("rsi", { period: v })} />
            </Row>

            <Row label="MACD" enabled={state.macd.enabled} onToggle={() => toggle("macd")}>
              <NumInput label="Rápida" value={state.macd.fast} onChange={(v) => set("macd", { fast: v })} />
              <NumInput label="Lenta" value={state.macd.slow} onChange={(v) => set("macd", { slow: v })} />
              <NumInput label="Señal" value={state.macd.signal} onChange={(v) => set("macd", { signal: v })} />
            </Row>

            <Row label="ATR" enabled={state.atr.enabled} onToggle={() => toggle("atr")}>
              <NumInput label="Periodo" value={state.atr.period} onChange={(v) => set("atr", { period: v })} />
            </Row>

            <Row label="ADX" enabled={state.adx.enabled} onToggle={() => toggle("adx")}>
              <NumInput label="Periodo" value={state.adx.period} onChange={(v) => set("adx", { period: v })} />
            </Row>
          </div>
        </>
      )}
    </div>
  )
}
