import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { computeUserMetrics } from "@/lib/scoring/metrics"
import { UsersList } from "@/components/users/UsersList"
import { Suspense } from "react"

interface Props {
  searchParams: Promise<{ sort?: string }>
}

export default async function UsersPage({ searchParams }: Props) {
  const session = await requireAuth()
  const isAdmin = session.user.role === "ADMIN"
  const { sort = "ranking" } = await searchParams

  const users = await prisma.user.findMany({
    where: isAdmin ? {} : { active: true },
    select: {
      id: true, username: true, role: true, active: true, createdAt: true,
      operations: {
        where: { closedAt: { not: null }, pnl: { not: null }, pnlPct: { not: null } },
        select: { pnl: true, pnlPct: true, closedAt: true },
        orderBy: { closedAt: "desc" },
      },
    },
  })

  const rows = users.map((u) => {
    const closed = u.operations as { pnl: number; pnlPct: number; closedAt: Date | null }[]
    const metrics = computeUserMetrics(closed.map((o) => ({ pnl: o.pnl, pnlPct: o.pnlPct })))
    return {
      id: u.id,
      username: u.username,
      role: u.role as string,
      active: u.active,
      createdAt: u.createdAt,
      totalTrades: metrics.totalTrades,
      avgReturn: metrics.totalTrades >= 5 ? metrics.avgReturn : null,
      winRate: metrics.totalTrades >= 5 ? metrics.winRate : null,
      lastOpAt: closed[0]?.closedAt?.toISOString() ?? null,
    }
  })

  const qualified = rows.filter((r) => r.avgReturn !== null)
  const unqualified = rows.filter((r) => r.avgReturn === null)

  const sorted = [...qualified.sort((a, b) => {
    if (sort === "alpha") return a.username.localeCompare(b.username)
    if (sort === "ops") return b.totalTrades - a.totalTrades
    if (sort === "recent") {
      if (!a.lastOpAt && !b.lastOpAt) return 0
      if (!a.lastOpAt) return 1
      if (!b.lastOpAt) return -1
      return new Date(b.lastOpAt).getTime() - new Date(a.lastOpAt).getTime()
    }
    return b.avgReturn! - a.avgReturn!
  }), ...unqualified.sort((a, b) => a.username.localeCompare(b.username))]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">USUARIOS</h1>
      <Suspense>
        <UsersList users={sorted} isAdmin={isAdmin} />
      </Suspense>
    </div>
  )
}
