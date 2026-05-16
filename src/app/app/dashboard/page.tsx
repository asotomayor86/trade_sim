import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { computeUserMetrics } from "@/lib/scoring/metrics"

export default async function DashboardPage() {
  const session = await requireAuth()
  const userId = session.user.id

  const [openCount, closedOps] = await Promise.all([
    prisma.operation.count({ where: { userId, closedAt: null } }),
    prisma.operation.findMany({
      where: { userId, closedAt: { not: null }, pnl: { not: null }, pnlPct: { not: null } },
      select: { pnl: true, pnlPct: true },
    }),
  ])

  const metrics = computeUserMetrics(
    closedOps.map((o) => ({ pnl: o.pnl!, pnlPct: o.pnlPct! }))
  )

  const stats = [
    {
      label: "Operaciones abiertas",
      value: openCount.toString(),
      sub: null,
      color: "text-slate-900",
    },
    {
      label: "Retorno medio",
      value: metrics.totalTrades === 0
        ? "—"
        : `${metrics.avgReturn >= 0 ? "+" : ""}${metrics.avgReturn.toFixed(2)}%`,
      sub: metrics.totalTrades > 0 ? `${metrics.totalTrades} ops cerradas` : null,
      color: metrics.totalTrades === 0 ? "text-slate-900"
        : metrics.avgReturn >= 0 ? "text-green-700" : "text-red-600",
    },
    {
      label: "Win rate",
      value: metrics.totalTrades === 0 ? "—" : `${metrics.winRate.toFixed(0)}%`,
      sub: metrics.totalTrades > 0
        ? `PnL total: ${metrics.totalPnl >= 0 ? "+" : ""}$${metrics.totalPnl.toFixed(2)}`
        : null,
      color: "text-slate-900",
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">
        Bienvenido, {session.user.name}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
            {stat.sub && <p className="mt-1 text-xs text-slate-400">{stat.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
