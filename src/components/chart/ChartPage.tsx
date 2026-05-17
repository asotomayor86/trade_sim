"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChartContainer } from "./ChartContainer"
import { useRef } from "react"
import { AnalysisSelector } from "./AnalysisSelector"
import { StrategySelector } from "./StrategySelector"
import { LaunchOrderModal } from "./LaunchOrderModal"
import { StrategySuggestions } from "./StrategySuggestions"
import type { CandlePoint } from "@/lib/indicators/calculations"
import type { IndicatorConfig } from "@/lib/indicators/engine"
import type { AnalysisSummary, StrategySummary, SuggestionRow } from "@/app/app/chart/[symbol]/page"
import type { LastAppliedResult } from "@/actions/ultimo-analisis"
import { saveDrawings, loadDrawings } from "@/actions/drawings"
import type { ChartHandle } from "./ChartContainer"

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
  strategies: StrategySummary[]
  suggestions: SuggestionRow[]
}

export function ChartPage({ ticker, tickers, analyses, initialLastApplied, strategies, suggestions }: Props) {
  const router = useRouter()
  const chartRef = useRef<ChartHandle>(null)
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

  // Active strategy + order modal
  const [activeStrategy, setActiveStrategy] = useState<StrategySummary | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)

  // Filter strategies by active analysis
  const activeStrategies = activeAnalysisId
    ? strategies.filter((s) => s.analysisId === activeAnalysisId)
    : []

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

  // Clear suggestion lines when symbol or timeframe changes
  useEffect(() => {
    chartRef.current?.clearAllSuggestionLines()
  }, [ticker.symbol, timeframe])

  const handleApplyAnalysis = (id: string, name: string, indicators: IndicatorConfig[]) => {
    setActiveAnalysisId(id)
    setActiveAnalysisName(name)
    setActiveIndicators(indicators)
    setActiveStrategy(null) // reset strategy when analysis changes
  }

  const handleRemoveAnalysis = () => {
    setActiveAnalysisId(null)
    setActiveAnalysisName(null)
    setActiveIndicators([])
    setActiveStrategy(null)
  }

  const filtered = tickers.filter(
    (t) =>
      t.symbol.includes(search.toUpperCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  )

  // H-Line toggle node passed to ChartContainer's right slot
  const hLineButton = (
    <button
      onClick={() => setDrawingMode((m) => (m === "horizontal" ? "none" : "horizontal"))}
      title="Dibujar línea horizontal"
      className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
        drawingMode === "horizontal"
          ? "bg-amber-600/80 text-white"
          : "text-slate-600 hover:text-slate-400"
      }`}
    >
      ─ H-Line
    </button>
  )

  return (
    <div className="flex h-full flex-col gap-2">

      {/* ── Row 1: ticker + timeframe ─────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Ticker selector */}
        <div className="relative">
          <input
            value={search || ticker.symbol}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearch("")}
            onBlur={() => setTimeout(() => setSearch(""), 200)}
            className="w-28 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
          />
          {search && (
            <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              {filtered.slice(0, 30).map((t) => (
                <button
                  key={t.id}
                  onMouseDown={() => { setSearch(""); router.push(`/app/chart/${t.symbol}`) }}
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

        <span className="hidden text-sm text-slate-500 sm:block">{ticker.name}</span>

        <div className="flex-1" />

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
      </div>

      {/* ── Row 2: analysis + strategy + launch ───────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <AnalysisSelector
          analyses={analyses}
          tickerId={ticker.id}
          activeAnalysisId={activeAnalysisId}
          activeAnalysisName={activeAnalysisName}
          onApply={handleApplyAnalysis}
          onRemove={handleRemoveAnalysis}
        />

        {activeAnalysisId && activeStrategies.length > 0 && (
          <StrategySelector
            strategies={activeStrategies}
            activeStrategyId={activeStrategy?.id ?? null}
            onSelect={setActiveStrategy}
          />
        )}

        {activeStrategy && (
          <button
            onClick={() => setShowOrderModal(true)}
            className="rounded-md bg-emerald-800/70 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-700/70"
          >
            ⚡ Lanzar orden
          </button>
        )}

        {/* Indicator badges */}
        {activeIndicators.map((ind) => (
          <span
            key={ind.localId}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700/50 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-400"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ind.visual.color }} />
            {ind.tipo}
          </span>
        ))}
      </div>

      {/* ── Chart ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex h-48 items-center justify-center text-slate-500">Cargando velas…</div>
      )}
      {error && (
        <div className="rounded-md bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {!loading && !error && candles.length > 0 && (
        <ChartContainer
          ref={chartRef}
          candles={candles}
          tickerId={ticker.id}
          symbol={ticker.symbol}
          timeframe={timeframe}
          indicators={activeIndicators}
          drawingMode={drawingMode}
          onPriceHover={setHoveredPrice}
          loadDrawings={loadDrawings}
          saveDrawings={saveDrawings}
          rightSlot={hLineButton}
        />
      )}
      {!loading && !error && candles.length === 0 && (
        <div className="flex h-48 items-center justify-center text-slate-500">
          Sin datos de velas. El cron de precios aún no ha descargado el histórico de este ticker.
        </div>
      )}

      {/* ── Strategy suggestions ──────────────────────────────── */}
      {suggestions.length > 0 && (
        <StrategySuggestions
          suggestions={suggestions}
          strategies={strategies}
          tickerId={ticker.id}
          tickerSymbol={ticker.symbol}
          chartRef={chartRef}
        />
      )}

      {/* Launch order modal */}
      {showOrderModal && activeStrategy && (
        <LaunchOrderModal
          strategy={activeStrategy}
          tickerId={ticker.id}
          tickerSymbol={ticker.symbol}
          currentPrice={hoveredPrice}
          onClose={() => setShowOrderModal(false)}
        />
      )}
    </div>
  )
}
