import type { SpreadInfo } from "./types"

// Default spread % by GICS sector when Alpaca doesn't provide bid/ask
const DEFAULT_SPREAD_BY_SECTOR: Record<string, number> = {
  "Information Technology": 0.05,
  "Health Care": 0.06,
  "Financials": 0.04,
  "Consumer Discretionary": 0.06,
  "Communication Services": 0.05,
  "Industrials": 0.06,
  "Consumer Staples": 0.04,
  "Energy": 0.07,
  "Utilities": 0.05,
  "Real Estate": 0.06,
  "Materials": 0.07,
  "ETF": 0.03,
}

const FALLBACK_SPREAD_PCT = 0.06 // 6bp fallback

export function computeSpread(
  bid: number | null,
  ask: number | null,
  last: number,
  sector: string,
  spreadOverridePct?: number | null
): SpreadInfo {
  if (bid !== null && ask !== null && bid > 0 && ask > 0) {
    const mid = (bid + ask) / 2
    return { bid, ask, mid, spreadPct: (ask - bid) / mid, source: "alpaca" }
  }

  const spreadPct =
    (spreadOverridePct ?? DEFAULT_SPREAD_BY_SECTOR[sector] ?? FALLBACK_SPREAD_PCT) / 100

  const mid = last
  const half = (mid * spreadPct) / 2
  return {
    bid: +(mid - half).toFixed(4),
    ask: +(mid + half).toFixed(4),
    mid,
    spreadPct,
    source: "simulated",
  }
}
