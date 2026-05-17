"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChartContainer } from "./ChartContainer"
import { AnalysisSelector } from "./AnalysisSelector"
import type { CandlePoint } from "@/lib/indicators/calculations"
import type { IndicatorConfig } from "@/lib/indicators/engine"
import type { AnalysisSummary } from "@/app/app/chart/[symbol]/page"
import type { LastAppliedResult } from "@/actions/ultimo-analisis"
import { saveDrawings, loadDrawings } from "@/actions/drawings"

interface Ticker { id: string; symbol: string; name: string; sector: string }

const TIMEFRAMES = ["1D", "1H"] as const
type TF = (typeof TIMEFRAMES)[number]
const DRAWING_MODES = ["none", "horizontal"] as const
type DrawingMode = (typeof DRAWING_MODES)[number]

interface Props {
  ticker: Ticker
  tickers: Ticker[]
  analyses: AnalysisSummary[]
  initialLastApplied: LastAppliedResult | null
  userId: string
}

export function ChartPage({ ticker, tickers, analyses, initialLastApplied }: Props) {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState<TF>("1D")
  const [candles, setCandles] = useState<CandlePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none")
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null)
  const [search, setSearch] = useState("")

  // Active analysis state
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(
    initialLastApplied?.analysisId ?? null
  )
  const [activeAnalysisName, setActiveAnalysisName] = useState<string | null>(
    initialLastApplied?.analysisName ?? null
  )
  const [activeIndicators, setActiveIndicators] = useState<IndicatorConfig[]>(
    initialLastApplied?.indicators ?? []
  )

  // Fetch candles
  const fetchCandles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = new Date()
      if (timeframe === "1D") from.setFullYear(from.getFullYear() - 2)
      else from.setDate(from.getDate() - 90)

      const res = await fetch(
        `/api/market/candles?symbol=${ticker.symbol}&tf=${timeframe}&from=${from.toISOString()}`
      )
      if (!res.ok) throw new Error("Error cargando velas")
      const data = (await res.json()) as {
        time: string; open: number; high: number; low: number; close: number; volume: number
      }[]

      setCandles(
        data.map((c) => ({
          time: Math.floor(new Date(c.time).getTime() / 1000),
          open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [ticker.symbol, timeframe])

  useEffect(() => { fetchCandles() }, [fetchCandles])

  const handleApplyAnalysis = (id: string, name: string, indicators: IndicatorConfig[]) => {
    setActiveAnalysisId(id)
    setActiveAnalysisName(name)
    setActiveIndicators(indicators)
  }

  const handleRemoveAnalysis = () => {
    setActiveAnalysisId(null)
    setActiveAnalysisName(null)
    setActiveIndicators([])
  }

  const filtered = tickers.filter(
    (t) =>
      t.symbol.includes(search.toUpperCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Ticker selector */}
        <div className="relative">
          <input
            value={search || ticker.symbol}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearch("")}
            onBlur={() => setTimeout(() => setSearch(""), 200)}
            className="w-32 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
          />
          {search && (
            <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              {filtered.slice(0, 30).map((t) => (
                <button
                  key={t.id}
                  onMouseDown={() => {
                    setSearch("")
                    router.push(`/app/chart/${t.symbol}`)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-800"
                >
                  <span className="font-mono font-semibold text-white">{t.symbol}</span>
                  <span className="truncate text-slate-400">{t.name}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-500">Sin resultados</p>
              )}
            </div>
          )}
        </div>

        {/* Ticker name */}
        <span className="hidden text-sm text-slate-400 sm:block">{ticker.name}</span>
        {hoveredPrice !== null && (
          <span className="font-mono text-sm text-slate-300">${hoveredPrice.toFixed(2)}</span>
        )}

        <div className="flex-1" />

        {/* Analysis selector */}
        <AnalysisSelector
          analyses={analyses}
          tickerId={ticker.id}
          activeAnalysisId={activeAnalysisId}
          activeAnalysisName={activeAnalysisName}
          onApply={handleApplyAnalysis}
          onRemove={handleRemoveAnalysis}
        />

        {/* Timeframe */}
        <div className="flex overflow-hidden rounded-md border border-slate-700">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                timeframe === tf ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Drawing mode */}
        <button
          onClick={() => setDrawingMode((m) => (m === "horizontal" ? "none" : "horizontal"))}
          title="Dibujar línea horizontal"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            drawingMode === "horizontal"
              ? "bg-amber-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          ─ H-Line
        </button>
      </div>

      {/* Indicator badge */}
      {activeIndicators.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeIndicators.map((ind) => (
            <span
              key={ind.localId}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: ind.visual.color }}
              />
              {ind.tipo}
            </span>
          ))}
        </div>
      )}

      {/* Chart area */}
      {loading && (
        <div className="flex h-48 items-center justify-center text-slate-400">Cargando velas…</div>
      )}
      {error && (
        <div className="rounded-md bg-red-900/30 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {!loading && !error && candles.length > 0 && (
        <ChartContainer
          candles={candles}
          tickerId={ticker.id}
          symbol={ticker.symbol}
          timeframe={timeframe}
          indicators={activeIndicators}
          drawingMode={drawingMode}
          onPriceHover={setHoveredPrice}
          loadDrawings={loadDrawings}
          saveDrawings={saveDrawings}
        />
      )}
      {!loading && !error && candles.length === 0 && (
        <div className="flex h-48 items-center justify-center text-slate-400">
          Sin datos de velas. El cron de precios aún no ha descargado el histórico de este ticker.
        </div>
      )}
    </div>
  )
}
