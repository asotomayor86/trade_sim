/**
 * Indicator rendering engine.
 * Decouples analysis indicator configs from the chart rendering logic.
 * Provides a module-level cache keyed by (symbol, timeframe, tipo, params).
 */

import {
  calcEMA, calcSMA, calcRSI, calcMACD, calcBollinger,
  calcATR, calcADX, calcDonchian, calcVolumeSMA,
  calcVWAP, calcStochastic,
  type CandlePoint, type VWAPReset,
} from "./calculations"

export type IndicatorTipo = "SMA" | "EMA" | "BB" | "VWAP" | "RSI" | "MACD" | "STOCH" | "VOL"

export interface IndicatorVisual {
  color: string
  lineWidth: number
  lineStyle: number
}

export interface IndicatorConfig {
  localId: string
  tipo: IndicatorTipo
  params: Record<string, unknown>
  panel: "overlay" | "sub"
  visual: IndicatorVisual
}

export type CalcResult =
  | { kind: "line"; data: { time: number; value: number }[] }
  | { kind: "band"; data: { time: number; upper: number; middle: number; lower: number }[] }
  | { kind: "macd"; data: { time: number; macdLine: number; signalLine: number; histogram: number; histColor: string }[] }
  | { kind: "stoch"; data: { time: number; k: number; d: number }[] }
  | { kind: "volume"; data: { time: number; value: number; color: string }[]; smaData?: { time: number; value: number }[] }

// Module-level cache: cacheKey → CalcResult
const calcCache = new Map<string, CalcResult>()

function cacheKey(symbol: string, timeframe: string, tipo: string, params: Record<string, unknown>): string {
  return `${symbol}::${timeframe}::${tipo}::${JSON.stringify(params)}`
}

export function clearIndicatorCache(symbol: string, timeframe: string): void {
  for (const k of calcCache.keys()) {
    if (k.startsWith(`${symbol}::${timeframe}::`)) calcCache.delete(k)
  }
}

export function calcIndicator(
  cfg: IndicatorConfig,
  candles: CandlePoint[],
  symbol: string,
  timeframe: string,
): CalcResult {
  const key = cacheKey(symbol, timeframe, cfg.tipo, cfg.params)
  if (calcCache.has(key)) return calcCache.get(key)!

  let result: CalcResult

  switch (cfg.tipo) {
    case "SMA": {
      const periodo = Number(cfg.params.periodo ?? 20)
      result = { kind: "line", data: calcSMA(candles, periodo) }
      break
    }
    case "EMA": {
      const periodo = Number(cfg.params.periodo ?? 20)
      result = { kind: "line", data: calcEMA(candles, periodo) }
      break
    }
    case "BB": {
      const periodo = Number(cfg.params.periodo ?? 20)
      const desviaciones = Number(cfg.params.desviaciones ?? 2)
      result = { kind: "band", data: calcBollinger(candles, periodo, desviaciones) }
      break
    }
    case "VWAP": {
      const periodoReset = (cfg.params.periodo_reset as VWAPReset) ?? "diario"
      result = { kind: "line", data: calcVWAP(candles, periodoReset) }
      break
    }
    case "RSI": {
      const periodo = Number(cfg.params.periodo ?? 14)
      result = { kind: "line", data: calcRSI(candles, periodo) }
      break
    }
    case "MACD": {
      const fast = Number(cfg.params.periodo_rapida ?? 12)
      const slow = Number(cfg.params.periodo_lenta ?? 26)
      const signal = Number(cfg.params.periodo_señal ?? 9)
      result = { kind: "macd", data: calcMACD(candles, fast, slow, signal) }
      break
    }
    case "STOCH": {
      const periodK = Number(cfg.params.periodo_k ?? 14)
      const periodD = Number(cfg.params.periodo_d ?? 3)
      const smoothing = Number(cfg.params.suavizado ?? 3)
      result = { kind: "stoch", data: calcStochastic(candles, periodK, periodD, smoothing) }
      break
    }
    case "VOL": {
      const mostrarMedia = Boolean(cfg.params.mostrar_media ?? false)
      const periodoMedia = Number(cfg.params.periodo_media ?? 20)
      const volData = candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? "#22c55e55" : "#ef444455",
      }))
      const smaData = mostrarMedia && candles.length >= periodoMedia
        ? calcVolumeSMA(candles, periodoMedia)
        : undefined
      result = { kind: "volume", data: volData, smaData }
      break
    }
    default: {
      // Unknown legacy type — return empty line
      result = { kind: "line", data: [] }
    }
  }

  calcCache.set(key, result)
  return result
}

// ---- Default params per type ----

export const INDICATOR_DEFAULTS: Record<IndicatorTipo, Record<string, unknown>> = {
  SMA:   { periodo: 20 },
  EMA:   { periodo: 20 },
  BB:    { periodo: 20, desviaciones: 2 },
  VWAP:  { periodo_reset: "diario" },
  RSI:   { periodo: 14, nivel_sobrecompra: 70, nivel_sobreventa: 30 },
  MACD:  { periodo_rapida: 12, periodo_lenta: 26, periodo_señal: 9 },
  STOCH: { periodo_k: 14, periodo_d: 3, suavizado: 3, nivel_sobrecompra: 80, nivel_sobreventa: 20 },
  VOL:   { mostrar_media: false, periodo_media: 20 },
}

export const INDICATOR_PANEL: Record<IndicatorTipo, "overlay" | "sub"> = {
  SMA: "overlay", EMA: "overlay", BB: "overlay", VWAP: "overlay",
  RSI: "sub", MACD: "sub", STOCH: "sub", VOL: "sub",
}

// Auto-color palette (cycles through these when adding indicators)
const AUTO_COLORS = [
  "#f59e0b", "#3b82f6", "#a855f7", "#10b981", "#f97316",
  "#06b6d4", "#ec4899", "#84cc16", "#ef4444", "#6366f1",
]

export function autoColor(index: number): string {
  return AUTO_COLORS[index % AUTO_COLORS.length]
}

// ---- ATR / ADX fallback (legacy support) ----
export function calcLegacyIndicator(
  tipo: string,
  params: Record<string, unknown>,
  candles: CandlePoint[],
): CalcResult {
  switch (tipo.toUpperCase()) {
    case "ATR": {
      const periodo = Number(params.period ?? params.periodo ?? 14)
      return { kind: "line", data: calcATR(candles, periodo) }
    }
    case "ADX": {
      const periodo = Number(params.period ?? params.periodo ?? 14)
      const { adx } = calcADX(candles, periodo)
      return { kind: "line", data: adx }
    }
    case "DONCHIAN": {
      const periodo = Number(params.period ?? params.periodo ?? 20)
      return { kind: "band", data: calcDonchian(candles, periodo) }
    }
    default:
      return { kind: "line", data: [] }
  }
}
