import type { ExitTargetType, StopLossType } from "@prisma/client"

export interface MinimalCandle {
  high: number
  low: number
  close: number
  open: number
}

export interface EvaluatableOrder {
  targetPrice: number
  expiresAt: Date
}

export type OrderEval = "EXECUTE" | "EXPIRE" | "WAIT"

/**
 * Evaluate whether a PENDING order should be executed, expired, or kept waiting.
 * - EXECUTE: the candle's [low, high] range includes targetPrice
 * - EXPIRE: the order's expiresAt is in the past (checked before candle)
 * - WAIT: neither condition
 */
export function evaluateOrder(order: EvaluatableOrder, candle: MinimalCandle | null, now = new Date()): OrderEval {
  if (order.expiresAt <= now) return "EXPIRE"
  if (!candle) return "WAIT"
  if (candle.low <= order.targetPrice && order.targetPrice <= candle.high) return "EXECUTE"
  return "WAIT"
}

export interface EvaluatableOperation {
  tpPrice: number | null
  slPrice: number | null
  direction: "LONG" | "SHORT"
}

export type OperationEval = "CLOSE_TP" | "CLOSE_SL" | "HOLD"

/**
 * Evaluate whether an open strategy operation should be closed.
 * Rule: if both SL and TP fall within the candle's [low, high], SL wins (conservative criterion).
 */
export function evaluateOperation(op: EvaluatableOperation, candle: MinimalCandle): OperationEval {
  const { tpPrice, slPrice, direction } = op

  const slHit = slPrice !== null && candle.low <= slPrice && slPrice <= candle.high
  const tpHit = tpPrice !== null && candle.low <= tpPrice && tpPrice <= candle.high

  if (slHit) return "CLOSE_SL" // SL wins even if TP also in range
  if (tpHit) return "CLOSE_TP"
  return "HOLD"
}

// ---- Compute concrete exit prices from a strategy ----

export interface StrategyExitDef {
  exitTargetType: ExitTargetType
  exitTargetValue: number
  stopLossType: StopLossType
  stopLossValue: number
}

/**
 * Compute concrete tpPrice and slPrice from a strategy's exit definition and the actual entry price.
 * For BOLLINGER_MIDDLE and VWAP_TOUCH, we use the currentRefPrice (passed in from the cron
 * after computing it from recent candles). Falls back to percentage if ref is 0/null.
 */
export function computeExitPrices(
  strategy: StrategyExitDef,
  entryPrice: number,
  direction: "LONG" | "SHORT",
  currentRefPrice?: number, // for BOLLINGER_MIDDLE / VWAP_TOUCH
): { tpPrice: number; slPrice: number } {
  const sign = direction === "LONG" ? 1 : -1

  let tpPrice: number
  if (strategy.exitTargetType === "PERCENT_GAIN") {
    tpPrice = entryPrice * (1 + sign * strategy.exitTargetValue / 100)
  } else if ((strategy.exitTargetType === "BOLLINGER_MIDDLE" || strategy.exitTargetType === "VWAP_TOUCH") && currentRefPrice) {
    tpPrice = currentRefPrice
  } else {
    // Fallback: use exitTargetValue as a percentage
    tpPrice = entryPrice * (1 + sign * (strategy.exitTargetValue || 2) / 100)
  }

  let slPrice: number
  if (strategy.stopLossType === "PERCENT") {
    slPrice = entryPrice * (1 - sign * strategy.stopLossValue / 100)
  } else if (strategy.stopLossType === "BOLLINGER_MIDDLE" && currentRefPrice) {
    slPrice = currentRefPrice
  } else {
    slPrice = entryPrice * (1 - sign * (strategy.stopLossValue || 1.5) / 100)
  }

  return { tpPrice, slPrice }
}
