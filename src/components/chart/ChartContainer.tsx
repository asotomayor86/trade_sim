"use client"

import { useEffect, useRef, useCallback, useState } from "react"
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
import {
  calcEMA, calcSMA, calcRSI, calcMACD, calcBollinger,
  calcATR, calcADX, calcDonchian, calcVolumeSMA,
  type CandlePoint,
} from "@/lib/indicators/calculations"
import { saveDrawings, loadDrawings, type DrawingData } from "@/actions/drawings"

// Branded cast: number → UTCTimestamp (lightweight-charts internal type)
const T = (n: number) => n as unknown as UTCTimestamp
import type { IndicatorState } from "./IndicatorPanel"

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
  indicators: IndicatorState
  drawingMode: "none" | "horizontal"
  onPriceHover?: (price: number | null) => void
}

export function ChartContainer({
  candles, tickerId, indicators, drawingMode, onPriceHover,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  // Track all dynamic indicator series for cleanup
  const indicatorSeriesRef = useRef<ISeriesApi<SeriesType>[]>([])
  // Track price lines (drawings)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const [drawings, setDrawings] = useState<DrawingData[]>([])
  const [saved, setSaved] = useState(false)

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
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    // Crosshair price display
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
        price,
        color: newDrawing.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "",
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
    loadDrawings(tickerId).then((loaded) => {
      setDrawings(loaded)
    })
  }, [tickerId])

  // ---- Render saved drawings as price lines ----
  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return

    // Remove old lines
    priceLinesRef.current.forEach((pl) => {
      try { series.removePriceLine(pl) } catch { /* already removed */ }
    })
    priceLinesRef.current = []

    // Add current drawings
    drawings.forEach((d) => {
      const pl = series.createPriceLine({
        price: d.price,
        color: d.color,
        lineWidth: 1,
        lineStyle: d.lineStyle,
        axisLabelVisible: true,
        title: d.label,
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
  }, [candles])

  // ---- Update indicators ----
  useEffect(() => {
    const chart = chartRef.current
    const mainSeries = candleSeriesRef.current
    if (!chart || !mainSeries || candles.length === 0) return

    // Remove old indicator series
    indicatorSeriesRef.current.forEach((s) => {
      try { chart.removeSeries(s) } catch { /* already removed */ }
    })
    indicatorSeriesRef.current = []

    const track = <ST extends SeriesType>(s: ISeriesApi<ST>) => {
      indicatorSeriesRef.current.push(s as ISeriesApi<SeriesType>)
      return s
    }
    // Helpers to cast time
    const ld = (pts: { time: number; value: number }[]) =>
      pts.map((p) => ({ time: T(p.time), value: p.value }))
    const bd = (pts: { time: number; upper: number; lower: number; middle?: number }[], key: "upper" | "lower" | "middle") =>
      pts.map((p) => ({ time: T(p.time), value: (p[key] ?? p.upper) }))

    // Volume (pane 1)
    if (indicators.volume.enabled) {
      const vs = track(chart.addSeries(HistogramSeries, { color: "#334155", priceFormat: { type: "volume" }, priceScaleId: "volume" }, 1))
      vs.priceScale().applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } })
      vs.setData(candles.map((c) => ({ time: T(c.time), value: c.volume, color: c.close >= c.open ? "#22c55e55" : "#ef444455" })))
      if (indicators.volume.smaEnabled) {
        const smaVol = calcVolumeSMA(candles, indicators.volume.smaPeriod)
        if (smaVol.length) {
          const vs2 = track(chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceScaleId: "volume" }, 1))
          vs2.setData(ld(smaVol))
        }
      }
    }

    if (indicators.ema.enabled) {
      const data = calcEMA(candles, indicators.ema.period)
      if (data.length) track(chart.addSeries(LineSeries, { color: indicators.ema.color, lineWidth: 1 })).setData(ld(data))
    }
    if (indicators.ema2.enabled) {
      const data = calcEMA(candles, indicators.ema2.period)
      if (data.length) track(chart.addSeries(LineSeries, { color: indicators.ema2.color, lineWidth: 1 })).setData(ld(data))
    }
    if (indicators.sma.enabled) {
      const data = calcSMA(candles, indicators.sma.period)
      if (data.length) track(chart.addSeries(LineSeries, { color: indicators.sma.color, lineWidth: 1 })).setData(ld(data))
    }

    if (indicators.bollinger.enabled) {
      const data = calcBollinger(candles, indicators.bollinger.period, indicators.bollinger.stdDev)
      if (data.length) {
        track(chart.addSeries(LineSeries, { color: "#7c3aed88", lineWidth: 1 })).setData(bd(data, "upper"))
        track(chart.addSeries(LineSeries, { color: "#7c3aed", lineWidth: 1, lineStyle: LineStyle.Dashed })).setData(bd(data, "middle"))
        track(chart.addSeries(LineSeries, { color: "#7c3aed88", lineWidth: 1 })).setData(bd(data, "lower"))
      }
    }

    if (indicators.donchian.enabled) {
      const data = calcDonchian(candles, indicators.donchian.period)
      if (data.length) {
        track(chart.addSeries(LineSeries, { color: "#0ea5e9", lineWidth: 1 })).setData(bd(data, "upper"))
        track(chart.addSeries(LineSeries, { color: "#0ea5e9", lineWidth: 1 })).setData(bd(data, "lower"))
      }
    }

    if (indicators.rsi.enabled) {
      const data = calcRSI(candles, indicators.rsi.period)
      if (data.length) {
        const rs = track(chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 1, priceScaleId: "rsi" }, 2))
        rs.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } })
        rs.setData(ld(data))
        ;[70, 30].forEach((level) =>
          rs.createPriceLine({ price: level, color: "#475569", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: `${level}` })
        )
      }
    }

    if (indicators.macd.enabled) {
      const data = calcMACD(candles, indicators.macd.fast, indicators.macd.slow, indicators.macd.signal)
      if (data.length) {
        const histS = track(chart.addSeries(HistogramSeries, { priceScaleId: "macd" }, 3))
        histS.priceScale().applyOptions({ scaleMargins: { top: 0.2, bottom: 0.2 } })
        histS.setData(data.map((d) => ({ time: T(d.time), value: d.histogram, color: d.histColor })))
        track(chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, priceScaleId: "macd" }, 3))
          .setData(data.map((d) => ({ time: T(d.time), value: d.macdLine })))
        track(chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, priceScaleId: "macd" }, 3))
          .setData(data.map((d) => ({ time: T(d.time), value: d.signalLine })))
      }
    }

    if (indicators.atr.enabled) {
      const data = calcATR(candles, indicators.atr.period)
      if (data.length) {
        const pane = indicators.rsi.enabled ? 4 : 2
        track(chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1 }, pane)).setData(ld(data))
      }
    }

    if (indicators.adx.enabled) {
      const { adx, plusDI, minusDI } = calcADX(candles, indicators.adx.period)
      if (adx.length) {
        const pane = indicators.rsi.enabled ? (indicators.macd.enabled ? 4 : 3) : 2
        track(chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 1 }, pane)).setData(ld(adx))
        track(chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1 }, pane)).setData(ld(plusDI))
        track(chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1 }, pane)).setData(ld(minusDI))
      }
    }
  }, [candles, indicators]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveDrawings = useCallback(async () => {
    await saveDrawings(tickerId, drawings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [tickerId, drawings])

  const handleClearDrawings = useCallback(() => {
    const series = candleSeriesRef.current
    if (!series) return
    priceLinesRef.current.forEach((pl) => {
      try { series.removePriceLine(pl) } catch { /* ok */ }
    })
    priceLinesRef.current = []
    setDrawings([])
    setSaved(false)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
      {/* Drawing actions */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{drawings.length} línea{drawings.length !== 1 ? "s" : ""}</span>
        {drawings.length > 0 && (
          <>
            <button onClick={handleClearDrawings} className="rounded px-2 py-1 hover:bg-slate-800 hover:text-white">
              Borrar todas
            </button>
            <button
              onClick={handleSaveDrawings}
              className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-500"
            >
              {saved ? "✓ Guardado" : "Guardar dibujos"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
