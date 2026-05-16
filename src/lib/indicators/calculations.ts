import { EMA, SMA, RSI, MACD, BollingerBands, ATR, ADX } from "technicalindicators"

export interface CandlePoint {
  time: number // Unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface LinePoint {
  time: number
  value: number
}

export interface BandPoint {
  time: number
  upper: number
  middle: number
  lower: number
}

export interface MACDPoint {
  time: number
  macdLine: number
  signalLine: number
  histogram: number
  histColor: string
}

// Align shorter output array to end of candles array
function align(candles: CandlePoint[], values: number[]): LinePoint[] {
  const offset = candles.length - values.length
  return values.map((value, i) => ({ time: candles[i + offset].time, value }))
}

function alignWith<T>(candles: CandlePoint[], values: T[]): (T & { time: number })[] {
  const offset = candles.length - values.length
  return values.map((v, i) => ({ ...v, time: candles[i + offset].time }))
}

export function calcEMA(candles: CandlePoint[], period: number): LinePoint[] {
  if (candles.length < period) return []
  const values = EMA.calculate({ period, values: candles.map((c) => c.close) })
  return align(candles, values)
}

export function calcSMA(candles: CandlePoint[], period: number): LinePoint[] {
  if (candles.length < period) return []
  const values = SMA.calculate({ period, values: candles.map((c) => c.close) })
  return align(candles, values)
}

export function calcRSI(candles: CandlePoint[], period: number): LinePoint[] {
  if (candles.length < period + 1) return []
  const values = RSI.calculate({ period, values: candles.map((c) => c.close) })
  return align(candles, values)
}

export function calcMACD(
  candles: CandlePoint[],
  fast: number,
  slow: number,
  signal: number
): MACDPoint[] {
  if (candles.length < slow + signal) return []
  const values = MACD.calculate({
    fastPeriod: fast,
    slowPeriod: slow,
    signalPeriod: signal,
    values: candles.map((c) => c.close),
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })
  const offset = candles.length - values.length
  return values
    .filter((v) => v.MACD !== undefined && v.signal !== undefined && v.histogram !== undefined)
    .map((v, i) => ({
      time: candles[i + offset].time,
      macdLine: v.MACD!,
      signalLine: v.signal!,
      histogram: v.histogram!,
      histColor: v.histogram! >= 0 ? "#22c55e" : "#ef4444",
    }))
}

export function calcBollinger(
  candles: CandlePoint[],
  period: number,
  stdDev: number
): BandPoint[] {
  if (candles.length < period) return []
  const values = BollingerBands.calculate({
    period,
    stdDev,
    values: candles.map((c) => c.close),
  })
  const offset = candles.length - values.length
  return values.map((v, i) => ({
    time: candles[i + offset].time,
    upper: v.upper,
    middle: v.middle,
    lower: v.lower,
  }))
}

export function calcATR(candles: CandlePoint[], period: number): LinePoint[] {
  if (candles.length < period + 1) return []
  const values = ATR.calculate({
    period,
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
  })
  return align(candles, values)
}

export function calcADX(
  candles: CandlePoint[],
  period: number
): { adx: LinePoint[]; plusDI: LinePoint[]; minusDI: LinePoint[] } {
  const empty = { adx: [], plusDI: [], minusDI: [] }
  if (candles.length < period * 2) return empty
  const values = ADX.calculate({
    period,
    close: candles.map((c) => c.close),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
  })
  const offset = candles.length - values.length
  return {
    adx: values.map((v, i) => ({ time: candles[i + offset].time, value: v.adx })),
    plusDI: values.map((v, i) => ({ time: candles[i + offset].time, value: v.pdi })),
    minusDI: values.map((v, i) => ({ time: candles[i + offset].time, value: v.mdi })),
  }
}

export function calcDonchian(
  candles: CandlePoint[],
  period: number
): BandPoint[] {
  if (candles.length < period) return []
  return candles.slice(period - 1).map((_, i) => {
    const slice = candles.slice(i, i + period)
    return {
      time: candles[i + period - 1].time,
      upper: Math.max(...slice.map((c) => c.high)),
      middle: (Math.max(...slice.map((c) => c.high)) + Math.min(...slice.map((c) => c.low))) / 2,
      lower: Math.min(...slice.map((c) => c.low)),
    }
  })
}

export function calcVolumeSMA(candles: CandlePoint[], period: number): LinePoint[] {
  if (candles.length < period) return []
  const values = SMA.calculate({ period, values: candles.map((c) => c.volume) })
  return align(candles, values)
}
