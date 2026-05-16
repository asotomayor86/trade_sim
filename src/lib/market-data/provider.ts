import type { Quote, Candle, Timeframe } from "./types"

export interface MarketDataProvider {
  /** Single quote — for on-demand (chart open). */
  getQuote(symbol: string): Promise<Quote | null>

  /** Bulk quotes — ONE HTTP call for all symbols. Use in the cron. */
  getQuotes(symbols: string[]): Promise<Map<string, Quote>>

  /** Single-symbol candles — for on-demand chart loading. */
  getCandles(symbol: string, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]>

  /** Multi-symbol candles — ONE HTTP call. Use for bulk preload cron. */
  getCandlesBulk(
    symbols: string[],
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Map<string, Candle[]>>
}
