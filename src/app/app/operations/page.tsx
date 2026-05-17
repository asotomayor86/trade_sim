import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { OpenOperationModal } from "@/components/operations/OpenOperationModal"
import { OperationsTable } from "@/components/operations/OperationsTable"
import { calcUnrealizedPnL, type Direction } from "@/lib/operations/pnl"
import { computeSpread } from "@/lib/market-data/spread"
import Link from "next/link"

interface Props {
  searchParams: Promise<{ filter?: string }>
}

export default async function OperationsPage({ searchParams }: Props) {
  const session = await requireAuth()
  const userId = session.user.id
  const { filter } = await searchParams
  const playbookOnly = filter === "playbook"

  const opFilter = playbookOnly
    ? { userId, orderId: { not: null as string | null } }
    : { userId }

  const [tickers, analyses, openOps, closedOps] = await Promise.all([
    prisma.ticker.findMany({
      where: { active: true },
      orderBy: { symbol: "asc" },
      select: { id: true, symbol: true, name: true, sector: true, spreadOverridePct: true },
    }),
    prisma.analysis.findMany({
      where: { deleted: false },
      orderBy: [{ isStandard: "desc" }, { name: "asc" }],
      select: { id: true, name: true, bias: true, isStandard: true },
    }),
    prisma.operation.findMany({
      where: { ...opFilter, closedAt: null },
      orderBy: { openedAt: "desc" },
      include: {
        ticker: { select: { id: true, symbol: true, name: true, sector: true, spreadOverridePct: true } },
        analysis: { select: { name: true } },
        strategy: { select: { code: true } },
      },
    }),
    prisma.operation.findMany({
      where: { ...opFilter, closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 50,
      include: {
        ticker: { select: { symbol: true, name: true } },
        analysis: { select: { name: true } },
        strategy: { select: { code: true } },
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Operaciones</h1>
          {/* Playbook filter toggle */}
          <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm">
            <Link
              href="/app/operations"
              className={`px-3 py-1 ${!playbookOnly ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              Todas
            </Link>
            <Link
              href="/app/operations?filter=playbook"
              className={`px-3 py-1 ${playbookOnly ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              Playbook
            </Link>
          </div>
        </div>
        {!playbookOnly && <OpenOperationModal tickers={tickers} analyses={analyses} />}
      </div>

      <OperationsTable open={openWithPnl} closed={closedOps} />
    </div>
  )
}
