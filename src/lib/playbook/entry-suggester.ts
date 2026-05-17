/**
 * Pure function: given a strategy's entryRule + entryParams and a candle array,
 * return the suggested entry price (or null + reason if it cannot be computed).
 *
 * Reuses F11's indicator calculations; no side effects, no DB access.
 */

import { calcEMA, calcSMA, calcBollinger, calcVWAP } from "@/lib/indicators/calculations"
import type { CandlePoint } from "@/lib/indicators/calculations"

export type SuggestedEntry =
  | { price: number }
  | { price: null; reason: string }

export interface StrategyForSuggestion {
  entryRule: string
  entryParams: Record<string, unknown>
  suffix: string
}

/**
 * Derive direction from strategy suffix.
 */
function isShort(suffix: string): boolean {
  return suffix === "SHORT" || suffix === "DN"
}

export function calculateSuggestedEntry(
  strategy: StrategyForSuggestion,
  candles: CandlePoint[],
): SuggestedEntry {
  if (candles.length === 0) return { price: null, reason: "sin velas" }

  const { entryRule, entryParams } = strategy

  switch (entryRule) {
    case "EMA_CROSS_UP":
    case "EMA_CROSS_DOWN": {
      const emaPeriod = Number(entryParams.ema_fast ?? entryParams.ema_period ?? 20)
      if (candles.length < emaPeriod) {
        return { price: null, reason: `faltan velas (mínimo ${emaPeriod})` }
      }
      const ema = calcEMA(candles, emaPeriod)
      const last = ema[ema.length - 1]
      if (!last) return { price: null, reason: "EMA no calculable" }
      return { price: parseFloat(last.value.toFixed(4)) }
    }

    case "RSI_OVERSOLD_BB_LOWER": {
      const bbPeriod = Number(entryParams.bb_period ?? 20)
      if (candles.length < bbPeriod) {
        return { price: null, reason: `faltan velas (mínimo ${bbPeriod})` }
      }
      const bb = calcBollinger(candles, bbPeriod, 2)
      const last = bb[bb.length - 1]
      if (!last) return { price: null, reason: "Bollinger no calculable" }
      return { price: parseFloat(last.lower.toFixed(4)) }
    }

    case "BB_BREAKOUT_UP_VOLUME": {
      const bbPeriod = Number(entryParams.bb_period ?? 20)
      if (candles.length < bbPeriod) {
        return { price: null, reason: `faltan velas (mínimo ${bbPeriod})` }
      }
      const bb = calcBollinger(candles, bbPeriod, 2)
      const last = bb[bb.length - 1]
      if (!last) return { price: null, reason: "Bollinger no calculable" }
      return { price: parseFloat(last.upper.toFixed(4)) }
    }

    case "BB_BREAKOUT_DOWN_VOLUME": {
      const bbPeriod = Number(entryParams.bb_period ?? 20)
      if (candles.length < bbPeriod) {
        return { price: null, reason: `faltan velas (mínimo ${bbPeriod})` }
      }
      const bb = calcBollinger(candles, bbPeriod, 2)
      const last = bb[bb.length - 1]
      if (!last) return { price: null, reason: "Bollinger no calculable" }
      return { price: parseFloat(last.lower.toFixed(4)) }
    }

    case "EMA_STOCH_CROSS": {
      const emaPeriod = Number(entryParams.ema_period ?? 9)
      if (candles.length < emaPeriod) {
        return { price: null, reason: `faltan velas (mínimo ${emaPeriod})` }
      }
      const ema = calcEMA(candles, emaPeriod)
      const last = ema[ema.length - 1]
      if (!last) return { price: null, reason: "EMA no calculable" }
      return { price: parseFloat(last.value.toFixed(4)) }
    }

    case "VWAP_DEVIATION_RSI": {
      if (candles.length < 2) {
        return { price: null, reason: "faltan velas" }
      }
      const vwap = calcVWAP(candles, "diario")
      const last = vwap[vwap.length - 1]
      if (!last) return { price: null, reason: "VWAP no calculable" }
      // Suggest entry 1% below VWAP (buying the dip below VWAP)
      const deviation = Number(entryParams.vwap_deviation_pct ?? 1)
      const suggestedPrice = last.value * (1 - deviation / 100)
      return { price: parseFloat(suggestedPrice.toFixed(4)) }
    }

    default:
      return { price: null, reason: `regla desconocida: ${entryRule}` }
  }
}

// ---- Helper used by server component ----

export interface SuggestionRow {
  strategyId: string
  code: string
  name: string
  suffix: string
  entryRule: string
  suggestedPrice: number | null
  reason: string | null
  exitTargetType: string
  exitTargetValue: number
  stopLossType: string
  stopLossValue: number
  analysisId: string
}

export type FullStrategy = StrategyForSuggestion & {
  id: string
  code: string
  name: string
  exitTargetType: string
  exitTargetValue: number
  stopLossType: string
  stopLossValue: number
  analysisId: string
}

export function buildSuggestions(
  strategies: FullStrategy[],
  candles: CandlePoint[],
): SuggestionRow[] {
  return strategies.map((s) => {
    const result = calculateSuggestedEntry(s, candles)
    return {
      strategyId: s.id,
      code: s.code,
      name: s.name,
      suffix: s.suffix,
      entryRule: s.entryRule,
      suggestedPrice: result.price ?? null,
      reason: result.price === null ? (result as { price: null; reason: string }).reason : null,
      exitTargetType: s.exitTargetType,
      exitTargetValue: s.exitTargetValue,
      stopLossType: s.stopLossType,
      stopLossValue: s.stopLossValue,
      analysisId: s.analysisId,
    }
  })
}
