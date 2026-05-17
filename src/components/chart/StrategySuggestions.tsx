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
    <div className="rounded border border-slate-800 bg-slate-900/30">
      <p className="border-b border-slate-800/60 px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-slate-600">
        Estrategias aplicables
      </p>

      <div className="divide-y divide-slate-800/30">
        {suggestions.map((row) => {
          const isFixed = fixedLines.has(row.code)
          const hasPrice = row.suggestedPrice !== null

          return (
            <div
              key={row.strategyId}
              onClick={() => handleRowClick(row)}
              onMouseEnter={() => handleMouseEnter(row)}
              onMouseLeave={() => handleMouseLeave(row)}
              className={`flex items-center gap-3 px-3 py-2 text-xs transition-colors ${
                hasPrice ? "cursor-pointer hover:bg-slate-800/30" : "opacity-40"
              } ${isFixed ? "bg-slate-800/20" : ""}`}
            >
              {/* Fixed indicator dot */}
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isFixed ? "bg-amber-500" : "bg-slate-700"}`} />

              {/* Code */}
              <span className={`w-20 shrink-0 font-mono font-semibold ${
                isFixed
                  ? SUFFIX_COLOR[row.suffix] ?? "text-slate-400"
                  : "text-slate-500"
              }`}>
                {row.code}
              </span>

              {/* Name */}
              <span className="flex-1 truncate text-slate-600">{row.name}</span>

              {/* Suggested price */}
              <span className={`w-24 shrink-0 text-right font-mono ${
                hasPrice
                  ? isFixed ? "text-slate-300" : "text-slate-500"
                  : "text-slate-700"
              }`}>
                {hasPrice
                  ? `$${row.suggestedPrice!.toFixed(2)}`
                  : <span title={row.reason ?? "—"}>{row.reason ?? "—"}</span>
                }
              </span>

              {/* Launch button */}
              <button
                onClick={(e) => handleLaunch(e, row)}
                disabled={!hasPrice}
                className="shrink-0 rounded px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-800/60 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-20"
              >
                ⚡
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
