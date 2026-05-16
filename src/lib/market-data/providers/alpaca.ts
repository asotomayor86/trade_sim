import type { MarketDataProvider } from "../provider"
import type { Quote, Candle, Timeframe } from "../types"

// Strip BOM (U+FEFF) that PowerShell may inject when setting env vars via pipe
const clean = (s: string) => s.replace(/^﻿/, "").trim()

const BASE = clean(process.env.ALPACA_BASE_URL ?? "https://data.alpaca.markets")
const KEY = clean(process.env.ALPACA_API_KEY ?? "")
const SECRET = clean(process.env.ALPACA_API_SECRET ?? "")

function alpacaHeaders() {
  return {
    "APCA-API-KEY-ID": KEY,
    "APCA-API-SECRET-KEY": SECRET,
    Accept: "application/json",
  }
}

function toTimeframe(tf: Timeframe): string {
  return tf === "1D" ? "1Day" : "1Hour"
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0]
}

// ---------- Quote parsing ----------

interface AlpacaRawQuote {
  ap?: number  // ask price
  bp?: number  // bid price
  ap_size?: number
  c?: string   // last price (from trade)
}

interface AlpacaQuotesResponse {
  quotes: Record<string, AlpacaRawQuote>
}

function parseQuote(symbol: string, raw: AlpacaRawQuote, last: number): Quote {
  const bid = raw.bp ?? null
  const ask = raw.ap ?? null
  return { symbol, bid, ask, last, volume: null, timestamp: new Date(), source: "alpaca" }
}

// ---------- Bar parsing ----------

interface AlpacaBar {
  t: string   // timestamp ISO
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface AlpacaBarsResponse {
  bars: Record<string, AlpacaBar[]>
  next_page_token?: string
}

function parseCandles(symbol: string, bars: AlpacaBar[], timeframe: Timeframe): Candle[] {
  return bars.map((b) => ({
    symbol,
    timeframe,
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
    timestamp: new Date(b.t),
    source: "alpaca" as const,
  }))
}

// ---------- Provider ----------

export class AlpacaProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<Quote | null> {
    const quotes = await this.getQuotes([symbol])
    return quotes.get(symbol) ?? null
  }

  async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    if (symbols.length === 0) return new Map()

    const symbolsParam = symbols.join(",")
    const url = `${BASE}/v2/stocks/quotes/latest?symbols=${encodeURIComponent(symbolsParam)}&feed=iex`

    // Also fetch latest trades for last price
    const tradeUrl = `${BASE}/v2/stocks/trades/latest?symbols=${encodeURIComponent(symbolsParam)}&feed=iex`

    const [quoteRes, tradeRes] = await Promise.all([
      fetch(url, { headers: alpacaHeaders() }),
      fetch(tradeUrl, { headers: alpacaHeaders() }),
    ])

    const result = new Map<string, Quote>()

    if (!quoteRes.ok) return result

    const quoteData = (await quoteRes.json()) as AlpacaQuotesResponse
    const tradeData = tradeRes.ok
      ? ((await tradeRes.json()) as { trades: Record<string, { p: number }> })
      : { trades: {} }

    for (const symbol of symbols) {
      const raw = quoteData.quotes?.[symbol]
      if (!raw) continue
      const last = tradeData.trades?.[symbol]?.p ?? raw.ap ?? raw.bp ?? 0
      result.set(symbol, parseQuote(symbol, raw, last))
    }

    return result
  }

  async getCandles(symbol: string, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]> {
    const bulk = await this.getCandlesBulk([symbol], timeframe, from, to)
    return bulk.get(symbol) ?? []
  }

  async getCandlesBulk(
    symbols: string[],
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Map<string, Candle[]>> {
    if (symbols.length === 0) return new Map()

    const params = new URLSearchParams({
      symbols: symbols.join(","),
      timeframe: toTimeframe(timeframe),
      start: isoDate(from),
      end: isoDate(to),
      feed: "iex",
      limit: "10000",
    })

    const result = new Map<string, Candle[]>()
    let pageToken: string | undefined

    do {
      if (pageToken) params.set("page_token", pageToken)

      const res = await fetch(`${BASE}/v2/stocks/bars?${params.toString()}`, {
        headers: alpacaHeaders(),
      })

      if (!res.ok) break

      const data = (await res.json()) as AlpacaBarsResponse
      pageToken = data.next_page_token

      for (const [sym, bars] of Object.entries(data.bars ?? {})) {
        const existing = result.get(sym) ?? []
        result.set(sym, [...existing, ...parseCandles(sym, bars, timeframe)])
      }
    } while (pageToken)

    return result
  }
}
