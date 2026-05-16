import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { OpenOperationModal } from "@/components/operations/OpenOperationModal"
import { OperationsTable } from "@/components/operations/OperationsTable"
import { calcUnrealizedPnL, type Direction } from "@/lib/operations/pnl"
import { computeSpread } from "@/lib/market-data/spread"

export default async function OperationsPage() {
  const session = await requireAuth()
  const userId = session.user.id

  const [tickers, analyses, openOps, closedOps] = await Promise.all([
    prisma.ticker.findMany({
      where: { active: true },
      orderBy: { symbol: "asc" },
      select: { id: true, symbol: true, name: true, sector: true, spreadOverridePct: true },
    }),
    prisma.analysis.findMany({
      where: { OR: [{ userId }, { isStandard: true }], deleted: false },
      orderBy: [{ isStandard: "desc" }, { name: "asc" }],
      select: { id: true, name: true, bias: true, isStandard: true },
    }),
    prisma.operation.findMany({
      where: { userId, closedAt: null },
      orderBy: { openedAt: "desc" },
      include: {
        ticker: { select: { id: true, symbol: true, name: true, sector: true, spreadOverridePct: true } },
        analysis: { select: { name: true } },
      },
    }),
    prisma.operation.findMany({
      where: { userId, closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 50,
      include: {
        ticker: { select: { symbol: true, name: true } },
        analysis: { select: { name: true } },
      },
    }),
  ])

  // Enrich open operations with unrealized PnL
  const latestQuotes = await Promise.all(
    openOps.map((op) =>
      prisma.quote
        .findFirst({ where: { tickerId: op.tickerId }, orderBy: { timestamp: "desc" } })
        .then((q) => ({ opId: op.id, quote: q }))
    )
  )
  const quoteMap = Object.fromEntries(latestQuotes.map((lq) => [lq.opId, lq.quote]))

  const openWithPnl = openOps.map((op) => {
    const q = quoteMap[op.id]
    if (!q) return { ...op, unrealizedPnl: null, unrealizedPct: null, currentPrice: null }

    const spread = computeSpread(q.bid, q.ask, q.last, op.ticker.sector, op.ticker.spreadOverridePct)
    const { pnl, pnlPct, exitPrice } = calcUnrealizedPnL(
      op.direction as Direction,
      op.entryPrice,
      op.quantity,
      op.nominal,
      spread
    )
    return { ...op, unrealizedPnl: pnl, unrealizedPct: pnlPct, currentPrice: exitPrice }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Operaciones</h1>
        <OpenOperationModal tickers={tickers} analyses={analyses} />
      </div>

      <OperationsTable open={openWithPnl} closed={closedOps} />
    </div>
  )
}
