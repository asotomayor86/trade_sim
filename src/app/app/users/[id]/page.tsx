import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { computeUserMetrics } from "@/lib/scoring/metrics"
import { computeSpread } from "@/lib/market-data/spread"
import { calcUnrealizedPnL, type Direction } from "@/lib/operations/pnl"
import { UserCard } from "@/components/users/UserCard"
import { UserTabs } from "@/components/users/UserTabs"

interface Props {
  params: Promise<{ id: string }>
}

export default async function UserProfilePage({ params }: Props) {
  const session = await requireAuth()
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, role: true, active: true,
      createdAt: true, deactivatedAt: true, lastPasswordResetAt: true,
    },
  })

  if (!user) notFound()
  if (!user.active && session.user.role !== "ADMIN") notFound()

  const isMe = session.user.id === id
  const isAdminViewer = session.user.role === "ADMIN" && !isMe
  const mode = isMe ? "self" : isAdminViewer ? "admin" : "other"

  // Metrics from closed ops
  const closedOps = await prisma.operation.findMany({
    where: { userId: id, closedAt: { not: null }, pnl: { not: null }, pnlPct: { not: null } },
    select: { pnl: true, pnlPct: true },
  })
  const metrics = computeUserMetrics(closedOps.map((o) => ({ pnl: o.pnl!, pnlPct: o.pnlPct! })))
  const pnlPcts = closedOps.map((o) => o.pnlPct!)
  const bestTrade = pnlPcts.length ? Math.max(...pnlPcts) : null
  const worstTrade = pnlPcts.length ? Math.min(...pnlPcts) : null

  // Open ops enriched
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
      prisma.quote.findFirst({ where: { tickerId: op.tickerId }, orderBy: { timestamp: "desc" } })
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

  // Aggregated stats for Resumen + Análisis tabs
  const allClosed = await prisma.operation.findMany({
    where: { userId: id, closedAt: { not: null }, pnl: { not: null }, pnlPct: { not: null } },
    select: {
      pnl: true, pnlPct: true, direction: true, analysisId: true,
      ticker: { select: { symbol: true, sector: true } },
      analysis: { select: { name: true } },
    },
  })

  // By sector
  const sectorMap = new Map<string, { pnls: number[]; pcts: number[] }>()
  for (const op of allClosed) {
    const e = sectorMap.get(op.ticker.sector) ?? { pnls: [], pcts: [] }
    e.pnls.push(op.pnl!); e.pcts.push(op.pnlPct!)
    sectorMap.set(op.ticker.sector, e)
  }
  const bySector = [...sectorMap.entries()].map(([sector, { pnls, pcts }]) => ({
    sector, count: pnls.length,
    avgReturn: pcts.reduce((a, b) => a + b, 0) / pcts.length,
    winRate: (pnls.filter((p) => p > 0).length / pnls.length) * 100,
  })).sort((a, b) => b.count - a.count)

  // By analysis
  const analysisMap = new Map<string, { name: string; pnls: number[]; pcts: number[] }>()
  for (const op of allClosed) {
    const e = analysisMap.get(op.analysisId) ?? { name: op.analysis.name, pnls: [], pcts: [] }
    e.pnls.push(op.pnl!); e.pcts.push(op.pnlPct!)
    analysisMap.set(op.analysisId, e)
  }
  const byAnalysis = [...analysisMap.entries()].map(([analysisId, { name, pnls, pcts }]) => ({
    analysisId, name, count: pnls.length,
    avgReturn: pcts.reduce((a, b) => a + b, 0) / pcts.length,
    winRate: (pnls.filter((p) => p > 0).length / pnls.length) * 100,
  })).sort((a, b) => b.count - a.count)

  // Top tickers
  const tickerMap = new Map<string, number>()
  for (const op of allClosed) tickerMap.set(op.ticker.symbol, (tickerMap.get(op.ticker.symbol) ?? 0) + 1)
  const topTickers = [...tickerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([symbol, count]) => ({ symbol, count }))

  const directionSplit = {
    long: allClosed.filter((o) => o.direction === "LONG").length,
    short: allClosed.filter((o) => o.direction === "SHORT").length,
  }

  // Push subs for self
  const pushSubs = isMe
    ? (await prisma.pushSubscription.findMany({
        where: { userId: id },
        select: { id: true, endpoint: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })).map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))
    : undefined

  const stats = { bySector, byAnalysis, topTickers, directionSplit }

  // Serialize dates for client components
  const serialized = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
  }
  const serializedOpen = enrichedOpen.map((op) => ({
    ...op,
    openedAt: op.openedAt.toISOString(),
    ticker: { symbol: op.ticker.symbol, name: op.ticker.name },
    analysis: { name: op.analysis.name },
  }))

  return (
    <div className="space-y-6">
      <UserCard
        username={serialized.username}
        role={serialized.role}
        active={serialized.active}
        createdAt={serialized.createdAt}
        deactivatedAt={serialized.deactivatedAt}
        metrics={{ ...metrics, bestTrade, worstTrade }}
        isMe={isMe}
      />
      <UserTabs
        mode={mode}
        userId={id}
        username={serialized.username}
        active={serialized.active}
        role={serialized.role}
        openOps={serializedOpen}
        stats={stats}
        pushSubs={pushSubs}
      />
    </div>
  )
}
