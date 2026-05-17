"use client"

import { useState, useTransition } from "react"
import { applyAnalysis, removeLastApplied } from "@/actions/ultimo-analisis"
import type { AnalysisSummary } from "@/app/app/chart/[symbol]/page"
import type { IndicatorConfig } from "@/lib/indicators/engine"

interface Props {
  analyses: AnalysisSummary[]
  tickerId: string
  activeAnalysisId: string | null
  activeAnalysisName: string | null
  onApply: (analysisId: string, name: string, indicators: IndicatorConfig[]) => void
  onRemove: () => void
}

export function AnalysisSelector({
  analyses,
  tickerId,
  activeAnalysisId,
  activeAnalysisName,
  onApply,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleSelect = (a: AnalysisSummary) => {
    setOpen(false)
    startTransition(async () => {
      await applyAnalysis(tickerId, a.id)
      onApply(a.id, a.name, a.indicators)
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      await removeLastApplied(tickerId)
      onRemove()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Selector dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
        >
          <span className="text-slate-500">
            {pending ? "…" : ""}
          </span>
          {activeAnalysisName ? (
            <span className="max-w-36 truncate text-blue-300">{activeAnalysisName}</span>
          ) : (
            <span>Sin análisis</span>
          )}
          <span className="text-slate-500">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              <p className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Seleccionar análisis
              </p>
              <div className="max-h-64 overflow-y-auto">
                {analyses.length === 0 && (
                  <p className="px-3 py-3 text-sm text-slate-500">No hay análisis creados.</p>
                )}
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onMouseDown={() => handleSelect(a)}
                    className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-slate-800 ${
                      a.id === activeAnalysisId ? "bg-slate-800" : ""
                    }`}
                  >
                    <span className={`font-medium ${a.id === activeAnalysisId ? "text-blue-300" : "text-slate-200"}`}>
                      {a.name}
                      {a.id === activeAnalysisId && " ✓"}
                    </span>
                    {a.descripcion && (
                      <span className="truncate text-xs text-slate-500">{a.descripcion}</span>
                    )}
                    <span className="text-xs text-slate-600">
                      {a.indicators.length} indicador{a.indicators.length !== 1 ? "es" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Remove button */}
      {activeAnalysisId && (
        <button
          onClick={handleRemove}
          disabled={pending}
          title="Quitar análisis"
          className="rounded-md px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
        >
          ✕ Quitar
        </button>
      )}
    </div>
  )
}
