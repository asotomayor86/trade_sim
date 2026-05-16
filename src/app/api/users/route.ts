import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { computeUserMetrics } from "@/lib/scoring/metrics"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "ADMIN"
  const sort = req.nextUrl.searchParams.get("sort") ?? "ranking"

  const users = await prisma.user.findMany({
    where: isAdmin ? {} : { active: true },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
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
    const lastOpAt = closed[0]?.closedAt ?? null
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      totalTrades: metrics.totalTrades,
      avgReturn: metrics.totalTrades >= 5 ? metrics.avgReturn : null,
      winRate: metrics.totalTrades >= 5 ? metrics.winRate : null,
      lastOpAt,
    }
  })

  const qualified = rows.filter((r) => r.avgReturn !== null)
  const unqualified = rows.filter((r) => r.avgReturn === null)

  qualified.sort((a, b) => {
    if (sort === "alpha") return a.username.localeCompare(b.username)
    if (sort === "ops") return b.totalTrades - a.totalTrades
    if (sort === "recent") {
      if (!a.lastOpAt && !b.lastOpAt) return 0
      if (!a.lastOpAt) return 1
      if (!b.lastOpAt) return -1
      return new Date(b.lastOpAt).getTime() - new Date(a.lastOpAt).getTime()
    }
    return b.avgReturn! - a.avgReturn!  // ranking (default)
  })

  unqualified.sort((a, b) => a.username.localeCompare(b.username))

  return NextResponse.json([...qualified, ...unqualified])
}
