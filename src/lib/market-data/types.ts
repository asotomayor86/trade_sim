export type Timeframe = "1D" | "1H"

export interface Quote {
  symbol: string
  bid: number | null
  ask: number | null
  last: number
  volume: number | null
  timestamp: Date
  source: "alpaca" | "yahoo" | "mock"
}

export interface Candle {
  symbol: string
  timeframe: Timeframe
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: Date
  source: "alpaca" | "yahoo" | "mock"
}

export interface SpreadInfo {
  bid: number
  ask: number
  mid: number
  spreadPct: number
  source: "alpaca" | "simulated"
}
