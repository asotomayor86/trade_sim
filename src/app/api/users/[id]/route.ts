import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { computeUserMetrics } from "@/lib/scoring/metrics"
import { computeSpread } from "@/lib/market-data/spread"
import { calcUnrealizedPnL, type Direction } from "@/lib/operations/pnl"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, role: true, active: true,
      createdAt: true, deactivatedAt: true, lastPasswordResetAt: true,
    },
  })

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!user.active && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Closed ops for metrics
  const closedOps = await prisma.operation.findMany({
    where: { userId: id, closedAt: { not: null }, pnl: { not: null }, pnlPct: { not: null } },
    select: { pnl: true, pnlPct: true },
  })
  const metrics = computeUserMetrics(closedOps.map((o) => ({ pnl: o.pnl!, pnlPct: o.pnlPct! })))

  // Best / worst
  const pnlPcts = closedOps.map((o) => o.pnlPct!)
  const bestTrade = pnlPcts.length ? Math.max(...pnlPcts) : null
  const worstTrade = pnlPcts.length ? Math.min(...pnlPcts) : null

  // Open operations enriched with unrealized PnL
  const openOps = await prisma.operation.findMany({
    where: { userId: id, closedAt: null },
    orderBy: { openedAt: "desc" },
    include: {
      ticker: { select: { id: true, symbol: true, name: true, sector: true, spreadOverridePct: true } },
      analysis: { select: { name: true } },
    },
  })

  const latestQuotes = await Promise.all(
    openOps.map((op) =>
      prisma.quote
        .findFirst({ where: { tickerId: op.tickerId }, orderBy: { timestamp: "desc" } })
        .then((q) => ({ opId: op.id, quote: q }))
    )
  )
  const quoteMap = Object.fromEntries(latestQuotes.map((lq) => [lq.opId, lq.quote]))

  const enrichedOpen = openOps.map((op) => {
    const q = quoteMap[op.id]
    if (!q) return { ...op, unrealizedPnl: null, unrealizedPct: null, currentPrice: null }
    const spread = computeSpread(q.bid, q.ask, q.last, op.ticker.sector, op.ticker.spreadOverridePct)
    const { pnl, pnlPct, exitPrice } = calcUnrealizedPnL(
      op.direction as Direction, op.entryPrice, op.quantity, op.nominal, spread
    )
    return { ...op, unrealizedPnl: pnl, unrealizedPct: pnlPct, currentPrice: exitPrice }
  })

  return NextResponse.json({
    user,
    metrics: { ...metrics, bestTrade, worstTrade },
    openOps: enrichedOpen,
  })
}
