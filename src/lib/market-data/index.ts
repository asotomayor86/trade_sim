import { AlpacaProvider } from "./providers/alpaca"
import { YahooProvider } from "./providers/yahoo"
import { MockProvider } from "./providers/mock"
import type { MarketDataProvider } from "./provider"
import type { Quote, Candle, Timeframe } from "./types"

// Composite: Alpaca primary, Yahoo fallback for candles
class CompositeProvider implements MarketDataProvider {
  constructor(
    private alpaca: AlpacaProvider,
    private yahoo: YahooProvider
  ) {}

  getQuote(symbol: string) {
    return this.alpaca.getQuote(symbol)
  }

  getQuotes(symbols: string[]) {
    return this.alpaca.getQuotes(symbols)
  }

  async getCandles(symbol: string, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]> {
    const candles = await this.alpaca.getCandles(symbol, timeframe, from, to)
    if (candles.length > 0) return candles
    return this.yahoo.getCandles(symbol, timeframe, from, to)
  }

  async getCandlesBulk(
    symbols: string[],
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Map<string, Candle[]>> {
    const alpacaResult = await this.alpaca.getCandlesBulk(symbols, timeframe, from, to)
    const missing = symbols.filter((s) => !alpacaResult.get(s)?.length)
    if (missing.length === 0) return alpacaResult

    const yahooResult = await this.yahoo.getCandlesBulk(missing, timeframe, from, to)
    for (const [sym, candles] of yahooResult) {
      if (candles.length > 0) alpacaResult.set(sym, candles)
    }
    return alpacaResult
  }
}

function createProvider(): MarketDataProvider {
  if (process.env.NODE_ENV === "test") return new MockProvider()
  return new CompositeProvider(new AlpacaProvider(), new YahooProvider())
}

export const marketData: MarketDataProvider = createProvider()

export type { Quote, Candle, Timeframe, SpreadInfo } from "./types"
export type { MarketDataProvider } from "./provider"
