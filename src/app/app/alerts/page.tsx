import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AlertsClient } from "@/components/alerts/AlertsClient"

export default async function AlertsPage() {
  const session = await requireAuth()
  const userId = session.user.id

  const [tickers, alerts] = await Promise.all([
    prisma.ticker.findMany({
      where: { active: true },
      orderBy: { symbol: "asc" },
      select: { id: true, symbol: true, name: true },
    }),
    prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { ticker: { select: { symbol: true, name: true } } },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Alertas de precio</h1>
      <AlertsClient tickers={tickers} alerts={alerts} />
    </div>
  )
}
