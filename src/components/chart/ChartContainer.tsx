"use client"

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react"
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts"
import { calcIndicator, clearIndicatorCache, type IndicatorConfig, type CalcResult } from "@/lib/indicators/engine"
import type { CandlePoint } from "@/lib/indicators/calculations"
import type { DrawingData } from "@/actions/drawings"

// Public handle exposed via forwardRef
export interface ChartHandle {
  addSuggestionLine: (price: number, label: string, fixed?: boolean) => void
  removeSuggestionLine: (label: string) => void
  clearAllSuggestionLines: () => void
}

const T = (n: number) => n as unknown as UTCTimestamp

const DARK = {
  layout: { background: { color: "#0f172a" }, textColor: "#94a3b8" },
  grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
  crosshair: { vertLine: { color: "#475569" }, horzLine: { color: "#475569" } },
  timeScale: { borderColor: "#1e293b", timeVisible: true },
  rightPriceScale: { borderColor: "#1e293b" },
}

interface Props {
  candles: CandlePoint[]
  tickerId: string
  symbol: string
  timeframe: string
  indicators: IndicatorConfig[]
  drawingMode: "none" | "horizontal"
  onPriceHover?: (price: number | null) => void
  loadDrawings: (tickerId: string) => Promise<DrawingData[]>
  saveDrawings: (tickerId: string, drawings: DrawingData[]) => Promise<void>
  rightSlot?: React.ReactNode
}

export const ChartContainer = forwardRef<ChartHandle, Props>(function ChartContainer({
  candles, tickerId, symbol, timeframe, indicators, drawingMode, onPriceHover,
  loadDrawings, saveDrawings, rightSlot,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const indicatorSeriesRef = useRef<ISeriesApi<SeriesType>[]>([])
  const priceLinesRef = useRef<IPriceLine[]>([])
  // suggestion lines: label → IPriceLine
  const suggestionLinesRef = useRef<Map<string, IPriceLine>>(new Map())
  const [drawings, setDrawings] = useState<DrawingData[]>([])
  const [saved, setSaved] = useState(false)

  // ---- Expose suggestion-line API to parent via ref ----
  useImperativeHandle(ref, () => ({
    addSuggestionLine(price: number, label: string, fixed = false) {
      const series = candleSeriesRef.current
      if (!series) return
      // Remove existing line with same label first
      const existing = suggestionLinesRef.current.get(label)
      if (existing) {
        try { series.removePriceLine(existing) } catch { /* ok */ }
      }
      const line = series.createPriceLine({
        price,
        color: fixed ? "#f59e0b" : "#94a3b888",
        lineWidth: fixed ? 1 : 1,
        lineStyle: fixed ? LineStyle.Solid : LineStyle.Dotted,
        axisLabelVisible: true,
        title: label,
      })
      suggestionLinesRef.current.set(label, line)
    },
    removeSuggestionLine(label: string) {
      const series = candleSeriesRef.current
      if (!series) return
      const line = suggestionLinesRef.current.get(label)
      if (line) {
        try { series.removePriceLine(line) } catch { /* ok */ }
        suggestionLinesRef.current.delete(label)
      }
    },
    clearAllSuggestionLines() {
      const series = candleSeriesRef.current
      if (!series) return
      suggestionLinesRef.current.forEach((line) => {
        try { series.removePriceLine(line) } catch { /* ok */ }
      })
      suggestionLinesRef.current.clear()
    },
  }))

  // ---- Init chart once ----
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      ...DARK,
      width: containerRef.current.clientWidth,
      height: 520,
    })
    chartRef.current = chart

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    })
    candleSeriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(containerRef.current)

    chart.subscribeCrosshairMove((param) => {
      if (param.point && candleSeriesRef.current) {
        const price = candleSeriesRef.current.coordinateToPrice(param.point.y)
        onPriceHover?.(price ?? null)
      } else {
        onPriceHover?.(null)
      }
    })

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Click handler for drawing ----
  useEffect(() => {
    const chart = chartRef.current
    const series = candleSeriesRef.current
    if (!chart || !series) return

    const handler = (param: { point?: { x: number; y: number } }) => {
      if (drawingMode !== "horizontal" || !param.point) return
      const price = series.coordinateToPrice(param.point.y)
      if (price == null) return

      const newDrawing: DrawingData = {
        id: crypto.randomUUID(),
        type: "horizontal",
        price,
        color: "#f59e0b",
        label: "",
        lineStyle: LineStyle.Dashed,
      }
      const priceLine = series.createPriceLine({
        price, color: newDrawing.color, lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "",
      })
      priceLinesRef.current.push(priceLine)
      setDrawings((prev) => [...prev, newDrawing])
      setSaved(false)
    }

    chart.subscribeClick(handler)
    return () => chart.unsubscribeClick(handler)
  }, [drawingMode])

  // ---- Load drawings from DB ----
  useEffect(() => {
    if (!tickerId) return
    loadDrawings(tickerId).then(setDrawings)
  }, [tickerId, loadDrawings])

  // ---- Render drawings as price lines ----
  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return
    priceLinesRef.current.forEach((pl) => { try { series.removePriceLine(pl) } catch { /* ok */ } })
    priceLinesRef.current = []
    drawings.forEach((d) => {
      const pl = series.createPriceLine({
        price: d.price, color: d.color, lineWidth: 1,
        lineStyle: d.lineStyle, axisLabelVisible: true, title: d.label,
      })
      priceLinesRef.current.push(pl)
    })
  }, [drawings])

  // ---- Update candle data ----
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return
    candleSeriesRef.current.setData(
      candles.map((c) => ({ time: T(c.time), open: c.open, high: c.high, low: c.low, close: c.close }))
    )
    chartRef.current?.timeScale().fitContent()
    clearIndicatorCache(symbol, timeframe)
  }, [candles, symbol, timeframe])

  // ---- Render indicators from analysis ----
  useEffect(() => {
    const chart = chartRef.current
    const mainSeries = candleSeriesRef.current
    if (!chart || !mainSeries || candles.length === 0) return

    // Remove previous indicator series
    indicatorSeriesRef.current.forEach((s) => { try { chart.removeSeries(s) } catch { /* ok */ } })
    indicatorSeriesRef.current = []

    const track = <ST extends SeriesType>(s: ISeriesApi<ST>) => {
      indicatorSeriesRef.current.push(s as ISeriesApi<SeriesType>)
      return s
    }
    const ld = (pts: { time: number; value: number }[]) =>
      pts.map((p) => ({ time: T(p.time), value: p.value }))

    // Assign pane indices: overlay → 0, sub → sequential starting at 1
    let nextSubPane = 1
    const paneMap = new Map<string, number>()
    for (const ind of indicators) {
      if (ind.panel === "overlay") {
        paneMap.set(ind.localId, 0)
      } else {
        paneMap.set(ind.localId, nextSubPane++)
      }
    }

    for (const ind of indicators) {
      const result: CalcResult = calcIndicator(ind, candles, symbol, timeframe)
      const pane = paneMap.get(ind.localId) ?? 0
      const lw = ind.visual.lineWidth as 1 | 2 | 3 | 4
      const ls = ind.visual.lineStyle as LineStyle

      switch (result.kind) {
        case "line": {
          if (!result.data.length) break
          if (pane === 0) {
            track(chart.addSeries(LineSeries, { color: ind.visual.color, lineWidth: lw, lineStyle: ls }))
              .setData(ld(result.data))
          } else {
            // RSI overbought/oversold lines
            const isRSI = ind.tipo === "RSI"
            const isStoch = ind.tipo === "STOCH"
            const priceScaleId = `sub_${ind.localId}`
            const s = track(chart.addSeries(LineSeries, {
              color: ind.visual.color, lineWidth: lw, lineStyle: ls, priceScaleId,
            }, pane))
            s.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } })
            s.setData(ld(result.data))
            if (isRSI) {
              const ob = Number(ind.params.nivel_sobrecompra ?? 70)
              const os = Number(ind.params.nivel_sobreventa ?? 30)
              ;[ob, os].forEach((level) =>
                s.createPriceLine({ price: level, color: "#475569", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: `${level}` })
              )
            }
            if (isStoch) {
              const ob = Number(ind.params.nivel_sobrecompra ?? 80)
              const os = Number(ind.params.nivel_sobreventa ?? 20)
              ;[ob, os].forEach((level) =>
                s.createPriceLine({ price: level, color: "#475569", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: `${level}` })
              )
            }
          }
          break
        }

        case "band": {
          if (!result.data.length) break
          const alpha = "88"
          const colorFaded = ind.visual.color + alpha
          if (pane === 0) {
            track(chart.addSeries(LineSeries, { color: colorFaded, lineWidth: lw }))
              .setData(result.data.map((p) => ({ time: T(p.time), value: p.upper })))
            track(chart.addSeries(LineSeries, { color: ind.visual.color, lineWidth: lw, lineStyle: LineStyle.Dashed }))
              .setData(result.data.map((p) => ({ time: T(p.time), value: p.middle })))
            track(chart.addSeries(LineSeries, { color: colorFaded, lineWidth: lw }))
              .setData(result.data.map((p) => ({ time: T(p.time), value: p.lower })))
          }
          break
        }

        case "macd": {
          if (!result.data.length) break
          const priceScaleId = `sub_${ind.localId}`
          const hist = track(chart.addSeries(HistogramSeries, { priceScaleId }, pane))
          hist.priceScale().applyOptions({ scaleMargins: { top: 0.2, bottom: 0.2 } })
          hist.setData(result.data.map((d) => ({ time: T(d.time), value: d.histogram, color: d.histColor })))
          track(chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, priceScaleId }, pane))
            .setData(result.data.map((d) => ({ time: T(d.time), value: d.macdLine })))
          track(chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, priceScaleId }, pane))
            .setData(result.data.map((d) => ({ time: T(d.time), value: d.signalLine })))
          break
        }

        case "stoch": {
          if (!result.data.length) break
          const priceScaleId = `sub_${ind.localId}`
          const ob = Number(ind.params.nivel_sobrecompra ?? 80)
          const os = Number(ind.params.nivel_sobreventa ?? 20)
          const kLine = track(chart.addSeries(LineSeries, { color: ind.visual.color, lineWidth: lw, priceScaleId }, pane))
          kLine.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } })
          kLine.setData(result.data.map((d) => ({ time: T(d.time), value: d.k })))
          ;[ob, os].forEach((level) =>
            kLine.createPriceLine({ price: level, color: "#475569", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: `${level}` })
          )
          track(chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, priceScaleId }, pane))
            .setData(result.data.map((d) => ({ time: T(d.time), value: d.d })))
          break
        }

        case "volume": {
          if (!result.data.length) break
          const priceScaleId = `sub_${ind.localId}`
          const vs = track(chart.addSeries(HistogramSeries, {
            color: "#334155", priceFormat: { type: "volume" }, priceScaleId,
          }, pane))
          vs.priceScale().applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } })
          vs.setData(result.data.map((d) => ({ time: T(d.time), value: d.value, color: d.color })))
          if (result.smaData?.length) {
            track(chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceScaleId }, pane))
              .setData(ld(result.smaData))
          }
          break
        }
      }
    }
  }, [candles, indicators, symbol, timeframe]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveDrawings = useCallback(async () => {
    await saveDrawings(tickerId, drawings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [tickerId, drawings, saveDrawings])

  const handleClearDrawings = useCallback(() => {
    const series = candleSeriesRef.current
    if (!series) return
    priceLinesRef.current.forEach((pl) => { try { series.removePriceLine(pl) } catch { /* ok */ } })
    priceLinesRef.current = []
    setDrawings([])
    setSaved(false)
  }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={containerRef} className="w-full overflow-hidden rounded-lg" />
      <div className="flex items-center justify-between gap-2">
        {/* Left: drawing controls */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {drawings.length > 0 && (
            <>
              <span>{drawings.length} línea{drawings.length !== 1 ? "s" : ""}</span>
              <button onClick={handleClearDrawings} className="rounded px-2 py-0.5 hover:bg-slate-800 hover:text-slate-300">
                Borrar
              </button>
              <button
                onClick={handleSaveDrawings}
                className="rounded bg-slate-700 px-2 py-0.5 text-slate-300 hover:bg-slate-600"
              >
                {saved ? "✓ Guardado" : "Guardar"}
              </button>
            </>
          )}
        </div>
        {/* Right: slot for parent controls (H-Line, etc.) */}
        {rightSlot}
      </div>
    </div>
  )
})
