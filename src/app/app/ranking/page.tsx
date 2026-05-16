import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { computeRanking, periodToDate } from "@/lib/scoring/metrics"
import { RankingFilters } from "@/components/ranking/RankingFilters"
import { Suspense } from "react"

interface Props {
  searchParams: Promise<{ period?: string; sector?: string; analysisId?: string }>
}

export default async function RankingPage({ searchParams }: Props) {
  const session = await requireAuth()
  const { period = "all", sector, analysisId } = await searchParams

  const from = periodToDate(period)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    closedAt: { not: null },
    pnl: { not: null },
    pnlPct: { not: null },
  }
  if (from) where.closedAt = { not: null, gte: from }
  if (sector) where.ticker = { sector }
  if (analysisId) where.analysisId = analysisId

  const [rawOps, analyses] = await Promise.all([
    prisma.operation.findMany({
      where,
      select: {
        userId: true,
        pnl: true,
        pnlPct: true,
        user: { select: { username: true } },
      },
    }),
    prisma.analysis.findMany({
      where: { deleted: false },
      orderBy: [{ isStandard: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ])

  const ops = rawOps
    .filter((op) => op.pnl !== null && op.pnlPct !== null)
    .map((op) => ({
      userId: op.userId,
      username: op.user.username,
      pnl: op.pnl!,
      pnlPct: op.pnlPct!,
    }))

  const ranking = computeRanking(ops)
  const currentUserId = session.user.id

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Ranking</h1>
        <Suspense>
          <RankingFilters analyses={analyses} />
        </Suspense>
      </div>

      {ranking.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">
          No hay operaciones cerradas con los filtros actuales.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500">
                <th className="px-4 py-3 text-left font-medium w-12">#</th>
                <th className="px-4 py-3 text-left font-medium">Usuario</th>
                <th className="px-4 py-3 text-right font-medium">Retorno medio</th>
                <th className="px-4 py-3 text-right font-medium">Win rate</th>
                <th className="px-4 py-3 text-right font-medium">Operaciones</th>
                <th className="px-4 py-3 text-right font-medium">PnL total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranking.map((row, i) => {
                const isMe = row.userId === currentUserId
                return (
                  <tr
                    key={row.userId}
                    className={`${isMe ? "bg-blue-50 font-semibold" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-4 py-3">
                      {i === 0 ? (
                        <span className="text-amber-500 font-bold">🥇</span>
                      ) : i === 1 ? (
                        <span className="text-slate-400 font-bold">🥈</span>
                      ) : i === 2 ? (
                        <span className="text-amber-700 font-bold">🥉</span>
                      ) : (
                        <span className="text-slate-400">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={isMe ? "text-blue-700" : "text-slate-800"}>
                        {row.username}
                        {isMe && (
                          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                            Tú
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${row.avgReturn >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {row.avgReturn >= 0 ? "+" : ""}{row.avgReturn.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {row.winRate.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.totalTrades}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${row.totalPnl >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {row.totalPnl >= 0 ? "+" : ""}${row.totalPnl.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Solo se muestran usuarios con al menos una operación cerrada en el periodo seleccionado.
        El retorno medio es la media aritmética del PnL% de cada operación.
      </p>
    </div>
  )
}
