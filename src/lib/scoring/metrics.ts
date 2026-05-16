export interface OperationRecord {
  userId: string
  username: string
  pnl: number
  pnlPct: number
}

export interface UserMetrics {
  userId: string
  username: string
  avgReturn: number   // media aritmética de pnlPct
  winRate: number     // % operaciones con pnl > 0
  totalTrades: number
  totalPnl: number
}

/** Agrupa operaciones por usuario y calcula métricas. Devuelve ordenado por avgReturn desc. */
export function computeRanking(ops: OperationRecord[]): UserMetrics[] {
  const map = new Map<string, { username: string; pnls: number[]; pcts: number[] }>()

  for (const op of ops) {
    const entry = map.get(op.userId) ?? { username: op.username, pnls: [], pcts: [] }
    entry.pnls.push(op.pnl)
    entry.pcts.push(op.pnlPct)
    map.set(op.userId, entry)
  }

  const results: UserMetrics[] = []
  for (const [userId, { username, pnls, pcts }] of map) {
    const n = pnls.length
    results.push({
      userId,
      username,
      avgReturn: pcts.reduce((a, b) => a + b, 0) / n,
      winRate: (pnls.filter((p) => p > 0).length / n) * 100,
      totalTrades: n,
      totalPnl: pnls.reduce((a, b) => a + b, 0),
    })
  }

  return results.sort((a, b) => b.avgReturn - a.avgReturn)
}

/** Métricas de un único usuario (para dashboard). */
export function computeUserMetrics(ops: { pnl: number; pnlPct: number }[]) {
  if (ops.length === 0) return { avgReturn: 0, winRate: 0, totalTrades: 0, totalPnl: 0 }
  const n = ops.length
  return {
    avgReturn: ops.reduce((a, b) => a + b.pnlPct, 0) / n,
    winRate: (ops.filter((o) => o.pnl > 0).length / n) * 100,
    totalTrades: n,
    totalPnl: ops.reduce((a, b) => a + b.pnl, 0),
  }
}

export type Period = "7d" | "30d" | "90d" | "all"

export function periodToDate(period: Period | string | undefined): Date | null {
  if (!period || period === "all") return null
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export const SECTORS = [
  "Information Technology",
  "Health Care",
  "Financials",
  "Consumer Discretionary",
  "Communication Services",
  "Industrials",
  "Consumer Staples",
  "Energy",
  "Utilities",
  "Real Estate",
  "Materials",
  "ETF",
]
