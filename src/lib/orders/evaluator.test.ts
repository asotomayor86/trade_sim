import { describe, it, expect } from "vitest"
import { evaluateOrder, evaluateOperation, computeExitPrices } from "./evaluator"
import type { MinimalCandle } from "./evaluator"

const candle = (low: number, high: number): MinimalCandle => ({
  low, high, open: low, close: high,
})

const future = new Date(Date.now() + 7 * 24 * 3600 * 1000)
const past = new Date(Date.now() - 1000)

// ---- evaluateOrder ----

describe("evaluateOrder", () => {
  it("EXECUTE when targetPrice is between low and high", () => {
    expect(evaluateOrder({ targetPrice: 100, expiresAt: future }, candle(98, 102))).toBe("EXECUTE")
  })

  it("EXECUTE when targetPrice equals low", () => {
    expect(evaluateOrder({ targetPrice: 98, expiresAt: future }, candle(98, 102))).toBe("EXECUTE")
  })

  it("EXECUTE when targetPrice equals high", () => {
    expect(evaluateOrder({ targetPrice: 102, expiresAt: future }, candle(98, 102))).toBe("EXECUTE")
  })

  it("WAIT when targetPrice is above high", () => {
    expect(evaluateOrder({ targetPrice: 105, expiresAt: future }, candle(98, 102))).toBe("WAIT")
  })

  it("WAIT when targetPrice is below low", () => {
    expect(evaluateOrder({ targetPrice: 95, expiresAt: future }, candle(98, 102))).toBe("WAIT")
  })

  it("EXPIRE when expiresAt is in the past (regardless of candle)", () => {
    expect(evaluateOrder({ targetPrice: 100, expiresAt: past }, candle(98, 102))).toBe("EXPIRE")
  })

  it("EXPIRE when expiresAt is in the past and no candle", () => {
    expect(evaluateOrder({ targetPrice: 100, expiresAt: past }, null)).toBe("EXPIRE")
  })

  it("WAIT when no candle available", () => {
    expect(evaluateOrder({ targetPrice: 100, expiresAt: future }, null)).toBe("WAIT")
  })
})

// ---- evaluateOperation ----

describe("evaluateOperation", () => {
  it("CLOSE_TP when only TP in range (LONG)", () => {
    const result = evaluateOperation(
      { tpPrice: 105, slPrice: 95, direction: "LONG" },
      candle(104, 107)
    )
    expect(result).toBe("CLOSE_TP")
  })

  it("CLOSE_SL when only SL in range (LONG)", () => {
    const result = evaluateOperation(
      { tpPrice: 110, slPrice: 97, direction: "LONG" },
      candle(95, 100)
    )
    expect(result).toBe("CLOSE_SL")
  })

  it("CLOSE_SL when BOTH TP and SL are in same candle — SL wins", () => {
    const result = evaluateOperation(
      { tpPrice: 105, slPrice: 95, direction: "LONG" },
      candle(93, 108)
    )
    expect(result).toBe("CLOSE_SL")
  })

  it("HOLD when neither TP nor SL in range", () => {
    const result = evaluateOperation(
      { tpPrice: 120, slPrice: 80, direction: "LONG" },
      candle(99, 102)
    )
    expect(result).toBe("HOLD")
  })

  it("HOLD when both tpPrice and slPrice are null", () => {
    const result = evaluateOperation(
      { tpPrice: null, slPrice: null, direction: "LONG" },
      candle(99, 102)
    )
    expect(result).toBe("HOLD")
  })

  it("CLOSE_TP when only TP set and in range", () => {
    const result = evaluateOperation(
      { tpPrice: 101, slPrice: null, direction: "LONG" },
      candle(100, 103)
    )
    expect(result).toBe("CLOSE_TP")
  })

  it("CLOSE_SL when only SL set and in range", () => {
    const result = evaluateOperation(
      { tpPrice: null, slPrice: 98, direction: "LONG" },
      candle(96, 100)
    )
    expect(result).toBe("CLOSE_SL")
  })
})

// ---- computeExitPrices ----

describe("computeExitPrices", () => {
  it("PERCENT_GAIN LONG: tpPrice = entry * (1 + pct/100)", () => {
    const { tpPrice } = computeExitPrices(
      { exitTargetType: "PERCENT_GAIN", exitTargetValue: 3, stopLossType: "PERCENT", stopLossValue: 1.5 },
      100, "LONG"
    )
    expect(tpPrice).toBeCloseTo(103)
  })

  it("PERCENT LONG: slPrice = entry * (1 - pct/100)", () => {
    const { slPrice } = computeExitPrices(
      { exitTargetType: "PERCENT_GAIN", exitTargetValue: 3, stopLossType: "PERCENT", stopLossValue: 1.5 },
      100, "LONG"
    )
    expect(slPrice).toBeCloseTo(98.5)
  })

  it("PERCENT_GAIN SHORT: tpPrice = entry * (1 - pct/100)", () => {
    const { tpPrice } = computeExitPrices(
      { exitTargetType: "PERCENT_GAIN", exitTargetValue: 3, stopLossType: "PERCENT", stopLossValue: 1.5 },
      100, "SHORT"
    )
    expect(tpPrice).toBeCloseTo(97)
  })

  it("BOLLINGER_MIDDLE: uses currentRefPrice as tpPrice", () => {
    const { tpPrice } = computeExitPrices(
      { exitTargetType: "BOLLINGER_MIDDLE", exitTargetValue: 0, stopLossType: "PERCENT", stopLossValue: 2 },
      100, "LONG", 98
    )
    expect(tpPrice).toBe(98)
  })

  it("fallback to percentage when refPrice not provided for BOLLINGER_MIDDLE", () => {
    const { tpPrice } = computeExitPrices(
      { exitTargetType: "BOLLINGER_MIDDLE", exitTargetValue: 3, stopLossType: "PERCENT", stopLossValue: 2 },
      100, "LONG"
    )
    expect(tpPrice).toBeCloseTo(103)
  })
})
