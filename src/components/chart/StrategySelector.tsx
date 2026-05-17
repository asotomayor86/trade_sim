"use client"

import { useState } from "react"
import type { StrategySummary } from "@/app/app/chart/[symbol]/page"

interface Props {
  strategies: StrategySummary[]
  activeStrategyId: string | null
  onSelect: (strategy: StrategySummary | null) => void
}

export function StrategySelector({ strategies, activeStrategyId, onSelect }: Props) {
  const [open, setOpen] = useState(false)

  if (strategies.length === 0) return null

  const active = strategies.find((s) => s.id === activeStrategyId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
      >
        <span className="text-slate-500 text-xs">Estrategia:</span>
        {active ? (
          <span className="font-mono font-semibold text-emerald-400">{active.code}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        <span className="text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <p className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Estrategias disponibles
            </p>
            <div className="max-h-56 overflow-y-auto">
              {active && (
                <button
                  onMouseDown={() => { onSelect(null); setOpen(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-800 text-slate-500"
                >
                  ✕ Sin estrategia
                </button>
              )}
              {strategies.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={() => { onSelect(s); setOpen(false) }}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-slate-800 ${
                    s.id === activeStrategyId ? "bg-slate-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">{s.code}</span>
                    {s.id === activeStrategyId && <span className="text-xs text-slate-500">✓ activa</span>}
                  </div>
                  <span className="text-xs text-slate-400">{s.name}</span>
                  <span className="text-xs text-slate-600">
                    Obj: {s.exitTargetType === "PERCENT_GAIN" ? `${s.exitTargetValue}%` : s.exitTargetType} ·{" "}
                    SL: {s.stopLossType === "PERCENT" ? `${s.stopLossValue}%` : s.stopLossType}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
