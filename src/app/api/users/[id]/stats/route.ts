import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const ops = await prisma.operation.findMany({
    where: { userId: id, closedAt: { not: null }, pnl: { not: null }, pnlPct: { not: null } },
    select: {
      pnl: true, pnlPct: true, direction: true, analysisId: true,
      ticker: { select: { symbol: true, sector: true } },
      analysis: { select: { name: true } },
    },
  })

  // By sector
  const sectorMap = new Map<string, { pnls: number[]; pcts: number[] }>()
  for (const op of ops) {
    const sector = op.ticker.sector
    const e = sectorMap.get(sector) ?? { pnls: [], pcts: [] }
    e.pnls.push(op.pnl!); e.pcts.push(op.pnlPct!)
    sectorMap.set(sector, e)
  }
  const bySector = [...sectorMap.entries()].map(([sector, { pnls, pcts }]) => ({
    sector,
    count: pnls.length,
    avgReturn: pcts.reduce((a, b) => a + b, 0) / pcts.length,
    winRate: (pnls.filter((p) => p > 0).length / pnls.length) * 100,
  })).sort((a, b) => b.count - a.count)

  // By analysis
  const analysisMap = new Map<string, { name: string; pnls: number[]; pcts: number[] }>()
  for (const op of ops) {
    const e = analysisMap.get(op.analysisId) ?? { name: op.analysis.name, pnls: [], pcts: [] }
    e.pnls.push(op.pnl!); e.pcts.push(op.pnlPct!)
    analysisMap.set(op.analysisId, e)
  }
  const byAnalysis = [...analysisMap.entries()].map(([analysisId, { name, pnls, pcts }]) => ({
    analysisId, name,
    count: pnls.length,
    avgReturn: pcts.reduce((a, b) => a + b, 0) / pcts.length,
    winRate: (pnls.filter((p) => p > 0).length / pnls.length) * 100,
  })).sort((a, b) => b.count - a.count)

  // Top tickers
  const tickerMap = new Map<string, number>()
  for (const op of ops) {
    tickerMap.set(op.ticker.symbol, (tickerMap.get(op.ticker.symbol) ?? 0) + 1)
  }
  const topTickers = [...tickerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, count]) => ({ symbol, count }))

  // Direction split
  const long = ops.filter((o) => o.direction === "LONG").length
  const short = ops.filter((o) => o.direction === "SHORT").length

  return NextResponse.json({ bySector, byAnalysis, topTickers, directionSplit: { long, short } })
}
