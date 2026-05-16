import yahooFinance from "yahoo-finance2"
import type { MarketDataProvider } from "../provider"
import type { Quote, Candle, Timeframe } from "../types"

export class YahooProvider implements MarketDataProvider {
  // Yahoo doesn't provide real-time bid/ask — only candles
  async getQuote(_symbol: string): Promise<Quote | null> {
    return null
  }

  async getQuotes(_symbols: string[]): Promise<Map<string, Quote>> {
    return new Map()
  }

  async getCandles(symbol: string, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]> {
    const interval = timeframe === "1D" ? "1d" : "1h"
    try {
      const result = await yahooFinance.chart(symbol, {
        period1: from,
        period2: to,
        interval,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quotes: any[] = (result as any).quotes ?? []
      return quotes
        .filter((q) => q.open !== null)
        .map((q) => ({
          symbol,
          timeframe,
          open: q.open as number,
          high: q.high as number,
          low: q.low as number,
          close: q.close as number,
          volume: (q.volume as number) ?? 0,
          timestamp: new Date(q.date as string),
          source: "yahoo" as const,
        }))
    } catch {
      return []
    }
  }

  async getCandlesBulk(
    symbols: string[],
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Map<string, Candle[]>> {
    const entries = await Promise.all(
      symbols.map(async (s) => [s, await this.getCandles(s, timeframe, from, to)] as const)
    )
    return new Map(entries)
  }
}
