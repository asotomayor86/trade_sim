"use client"

import { useState, useRef, useTransition } from "react"
import { LaunchOrderModal } from "./LaunchOrderModal"
import type { ChartHandle } from "./ChartContainer"
import type { SuggestionRow } from "@/app/app/chart/[symbol]/page"
import type { StrategySummary } from "@/app/app/chart/[symbol]/page"

interface Props {
  suggestions: SuggestionRow[]
  strategies: StrategySummary[]
  tickerId: string
  tickerSymbol: string
  chartRef: React.RefObject<ChartHandle | null>
}

const SUFFIX_COLOR: Record<string, string> = {
  LONG: "text-green-400",
  SHORT: "text-red-400",
  BNC: "text-blue-400",
  UP: "text-emerald-400",
  DN: "text-orange-400",
}

export function StrategySuggestions({ suggestions, strategies, tickerId, tickerSymbol, chartRef }: Props) {
  const [fixedLines, setFixedLines] = useState<Set<string>>(new Set())
  const [modalRow, setModalRow] = useState<SuggestionRow | null>(null)

  const handleMouseEnter = (row: SuggestionRow) => {
    if (row.suggestedPrice === null) return
    if (fixedLines.has(row.code)) return // already fixed, don't change to temp
    chartRef.current?.addSuggestionLine(row.suggestedPrice, row.code, false)
  }

  const handleMouseLeave = (row: SuggestionRow) => {
    if (fixedLines.has(row.code)) return // keep fixed line
    chartRef.current?.removeSuggestionLine(row.code)
  }

  const handleRowClick = (row: SuggestionRow) => {
    if (row.suggestedPrice === null) return
    setFixedLines((prev) => {
      const next = new Set(prev)
      if (next.has(row.code)) {
        // Toggle off
        next.delete(row.code)
        chartRef.current?.removeSuggestionLine(row.code)
      } else {
        // Toggle on with fixed style
        next.add(row.code)
        chartRef.current?.addSuggestionLine(row.suggestedPrice!, row.code, true)
      }
      return next
    })
  }

  const handleLaunch = (e: React.MouseEvent, row: SuggestionRow) => {
    e.stopPropagation()
    setModalRow(row)
  }

  const modalStrategy = modalRow
    ? strategies.find((s) => s.id === modalRow.strategyId) ?? null
    : null

  if (suggestions.length === 0) return null

  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60">
      <p className="border-b border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Estrategias aplicables
      </p>

      <div className="divide-y divide-slate-800/60">
        {suggestions.map((row) => {
          const isFixed = fixedLines.has(row.code)
          const hasPrice = row.suggestedPrice !== null

          return (
            <div
              key={row.strategyId}
              onClick={() => handleRowClick(row)}
              onMouseEnter={() => handleMouseEnter(row)}
              onMouseLeave={() => handleMouseLeave(row)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                hasPrice ? "cursor-pointer hover:bg-slate-800/60" : "opacity-60"
              } ${isFixed ? "bg-slate-800/40" : ""}`}
            >
              {/* Fixed indicator */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${isFixed ? "bg-amber-400" : "bg-transparent"}`} />

              {/* Code + suffix */}
              <span className={`font-mono font-bold w-20 shrink-0 ${SUFFIX_COLOR[row.suffix] ?? "text-slate-300"}`}>
                {row.code}
              </span>

              {/* Name */}
              <span className="truncate text-slate-400 flex-1 text-xs">{row.name}</span>

              {/* Suggested price */}
              <span className={`font-mono shrink-0 w-24 text-right ${
                hasPrice ? "text-slate-200" : "text-slate-600"
              }`}>
                {hasPrice
                  ? `$${row.suggestedPrice!.toFixed(2)}`
                  : <span title={row.reason ?? ""}>{row.reason ? `— ${row.reason}` : "—"}</span>
                }
              </span>

              {/* Launch button */}
              <button
                onClick={(e) => handleLaunch(e, row)}
                disabled={!hasPrice}
                className="shrink-0 rounded bg-emerald-800 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ⚡ Lanzar
              </button>
            </div>
          )
        })}
      </div>

      {/* Launch order modal */}
      {modalRow && modalStrategy && (
        <LaunchOrderModal
          strategy={modalStrategy}
          tickerId={tickerId}
          tickerSymbol={tickerSymbol}
          currentPrice={null}
          lockedPrice={modalRow.suggestedPrice ?? undefined}
          onClose={() => setModalRow(null)}
        />
      )}
    </div>
  )
}
