import { describe, it, expect } from "vitest"
import { calculateSuggestedEntry } from "./entry-suggester"
import type { CandlePoint } from "@/lib/indicators/calculations"

// ---- Helpers ----

function makeCandles(n: number, basePrice = 100): CandlePoint[] {
  return Array.from({ length: n }, (_, i) => ({
    time: 1700000000 + i * 86400,
    open: basePrice + Math.sin(i * 0.3) * 2,
    high: basePrice + Math.abs(Math.sin(i * 0.3)) * 3 + 1,
    low: basePrice - Math.abs(Math.sin(i * 0.3)) * 3 - 1,
    close: basePrice + Math.cos(i * 0.3) * 2,
    volume: 1_000_000,
  }))
}

function strat(entryRule: string, entryParams: Record<string, unknown> = {}, suffix = "LONG") {
  return { entryRule, entryParams, suffix }
}

// ---- EMA_CROSS_UP ----

describe("EMA_CROSS_UP", () => {
  it("returns EMA20 price with enough candles", () => {
    const candles = makeCandles(30)
    const result = calculateSuggestedEntry(strat("EMA_CROSS_UP", { ema_fast: 20 }), candles)
    expect(result.price).not.toBeNull()
    expect(typeof result.price).toBe("number")
    expect(result.price).toBeGreaterThan(0)
  })

  it("returns null when fewer candles than period", () => {
    const candles = makeCandles(10)
    const result = calculateSuggestedEntry(strat("EMA_CROSS_UP", { ema_fast: 20 }), candles)
    expect(result.price).toBeNull()
    expect((result as { price: null; reason: string }).reason).toMatch(/faltan/)
  })
})

// ---- EMA_CROSS_DOWN ----

describe("EMA_CROSS_DOWN", () => {
  it("returns EMA price with enough candles", () => {
    const result = calculateSuggestedEntry(strat("EMA_CROSS_DOWN", { ema_fast: 20 }), makeCandles(30))
    expect(result.price).not.toBeNull()
  })

  it("returns null with too few candles", () => {
    const result = calculateSuggestedEntry(strat("EMA_CROSS_DOWN", { ema_fast: 20 }), makeCandles(5))
    expect(result.price).toBeNull()
  })
})

// ---- RSI_OVERSOLD_BB_LOWER ----

describe("RSI_OVERSOLD_BB_LOWER", () => {
  it("returns Bollinger lower band price", () => {
    const result = calculateSuggestedEntry(strat("RSI_OVERSOLD_BB_LOWER", { bb_period: 20 }), makeCandles(30))
    expect(result.price).not.toBeNull()
    // Lower band should be below close price
    const candles = makeCandles(30)
    expect(result.price!).toBeLessThan(candles[candles.length - 1].close + 20)
  })

  it("returns null with too few candles", () => {
    const result = calculateSuggestedEntry(strat("RSI_OVERSOLD_BB_LOWER", { bb_period: 20 }), makeCandles(10))
    expect(result.price).toBeNull()
    expect((result as { price: null; reason: string }).reason).toMatch(/faltan/)
  })
})

// ---- BB_BREAKOUT_UP_VOLUME ----

describe("BB_BREAKOUT_UP_VOLUME", () => {
  it("returns Bollinger upper band price", () => {
    const candles = makeCandles(30)
    const result = calculateSuggestedEntry(strat("BB_BREAKOUT_UP_VOLUME", { bb_period: 20 }), candles)
    expect(result.price).not.toBeNull()
    // Upper band should be above close
    expect(result.price!).toBeGreaterThan(candles[candles.length - 1].close - 20)
  })

  it("returns null with too few candles", () => {
    const result = calculateSuggestedEntry(strat("BB_BREAKOUT_UP_VOLUME", { bb_period: 20 }), makeCandles(5))
    expect(result.price).toBeNull()
  })
})

// ---- BB_BREAKOUT_DOWN_VOLUME ----

describe("BB_BREAKOUT_DOWN_VOLUME", () => {
  it("returns Bollinger lower band price", () => {
    const result = calculateSuggestedEntry(strat("BB_BREAKOUT_DOWN_VOLUME", { bb_period: 20 }), makeCandles(30))
    expect(result.price).not.toBeNull()
  })

  it("returns null with too few candles", () => {
    const result = calculateSuggestedEntry(strat("BB_BREAKOUT_DOWN_VOLUME", { bb_period: 20 }), makeCandles(3))
    expect(result.price).toBeNull()
  })
})

// ---- EMA_STOCH_CROSS ----

describe("EMA_STOCH_CROSS", () => {
  it("returns EMA9 price", () => {
    const result = calculateSuggestedEntry(strat("EMA_STOCH_CROSS", { ema_period: 9 }), makeCandles(20))
    expect(result.price).not.toBeNull()
    expect(typeof result.price).toBe("number")
  })

  it("returns null with too few candles", () => {
    const result = calculateSuggestedEntry(strat("EMA_STOCH_CROSS", { ema_period: 9 }), makeCandles(3))
    expect(result.price).toBeNull()
  })
})

// ---- VWAP_DEVIATION_RSI ----

describe("VWAP_DEVIATION_RSI", () => {
  it("returns VWAP × 0.99 by default", () => {
    const candles = makeCandles(30, 100)
    const result = calculateSuggestedEntry(strat("VWAP_DEVIATION_RSI", { vwap_deviation_pct: 1 }), candles)
    expect(result.price).not.toBeNull()
    // Price should be roughly 99% of ~100
    expect(result.price!).toBeGreaterThan(80)
    expect(result.price!).toBeLessThan(115)
  })

  it("returns null with zero candles", () => {
    const result = calculateSuggestedEntry(strat("VWAP_DEVIATION_RSI"), [])
    expect(result.price).toBeNull()
    expect((result as { price: null; reason: string }).reason).toMatch(/sin velas/)
  })
})

// ---- Unknown rule ----

describe("unknown entryRule", () => {
  it("returns null with reason", () => {
    const result = calculateSuggestedEntry(strat("UNKNOWN_RULE"), makeCandles(30))
    expect(result.price).toBeNull()
    expect((result as { price: null; reason: string }).reason).toMatch(/desconocida/)
  })
})

// ---- Empty candles (all rules) ----

describe("empty candles", () => {
  const rules = [
    "EMA_CROSS_UP", "EMA_CROSS_DOWN", "RSI_OVERSOLD_BB_LOWER",
    "BB_BREAKOUT_UP_VOLUME", "BB_BREAKOUT_DOWN_VOLUME", "EMA_STOCH_CROSS", "VWAP_DEVIATION_RSI"
  ]

  rules.forEach((rule) => {
    it(`${rule}: returns null for empty candles`, () => {
      const result = calculateSuggestedEntry(strat(rule), [])
      expect(result.price).toBeNull()
    })
  })
})
