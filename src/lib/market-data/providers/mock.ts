import type { MarketDataProvider } from "../provider"
import type { Quote, Candle, Timeframe } from "../types"

const BASE_PRICES: Record<string, number> = {
  AAPL: 185, MSFT: 415, GOOGL: 175, AMZN: 195, NVDA: 880,
  META: 520, TSLA: 175, "BRK.B": 375, JPM: 205, V: 275,
}

function mockQuote(symbol: string): Quote {
  const last = BASE_PRICES[symbol] ?? 100
  return {
    symbol,
    bid: +(last * 0.9995).toFixed(2),
    ask: +(last * 1.0005).toFixed(2),
    last,
    volume: Math.floor(Math.random() * 10_000_000),
    timestamp: new Date(),
    source: "mock",
  }
}

function mockCandles(symbol: string, timeframe: Timeframe, from: Date, to: Date): Candle[] {
  const candles: Candle[] = []
  const base = BASE_PRICES[symbol] ?? 100
  const msStep = timeframe === "1D" ? 86_400_000 : 3_600_000
  let t = from.getTime()
  while (t <= to.getTime()) {
    const close = +(base * (0.95 + Math.random() * 0.1)).toFixed(2)
    candles.push({
      symbol, timeframe,
      open: +(close * (0.99 + Math.random() * 0.02)).toFixed(2),
      high: +(close * (1.01 + Math.random() * 0.01)).toFixed(2),
      low: +(close * (0.98 + Math.random() * 0.01)).toFixed(2),
      close,
      volume: Math.floor(Math.random() * 5_000_000),
      timestamp: new Date(t),
      source: "mock",
    })
    t += msStep
  }
  return candles
}

export class MockProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<Quote | null> {
    return mockQuote(symbol)
  }

  async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    return new Map(symbols.map((s) => [s, mockQuote(s)]))
  }

  async getCandles(symbol: string, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]> {
    return mockCandles(symbol, timeframe, from, to)
  }

  async getCandlesBulk(
    symbols: string[],
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Map<string, Candle[]>> {
    return new Map(symbols.map((s) => [s, mockCandles(s, timeframe, from, to)]))
  }
}
