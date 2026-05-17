import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import Link from "next/link"

function formatCountdown(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now()
  if (ms <= 0) return "Expirado"
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  const mins = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${mins}m`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

const DIR_BADGE: Record<string, string> = {
  LONG: "bg-green-100 text-green-700",
  SHORT: "bg-red-100 text-red-700",
}

export default async function OrdersPage() {
  const session = await requireAuth()
  const userId = session.user.id

  const [pendingOrders, executedOps, unexecutedOrders] = await Promise.all([
    prisma.order.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        ticker: { select: { symbol: true, name: true } },
        strategy: { select: { code: true, name: true } },
      },
    }),
    prisma.operation.findMany({
      where: { userId, orderId: { not: null } },
      orderBy: { openedAt: "desc" },
      take: 50,
      include: {
        ticker: { select: { symbol: true } },
        strategy: { select: { code: true } },
      },
    }),
    prisma.unexecutedOrder.findMany({
      where: { userId },
      orderBy: { expiredAt: "desc" },
      take: 50,
      include: {
        ticker: { select: { symbol: true } },
        strategy: { select: { code: true, name: true } },
      },
    }),
  ])

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">ÓRDENES PLAYBOOK</h1>

      {/* ── Pendientes ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Pendientes ({pendingOrders.length})
        </h2>

        {pendingOrders.length === 0 ? (
          <p className="text-sm text-slate-400">
            Sin órdenes pendientes. Lanza una desde{" "}
            <Link href="/app/chart" className="text-blue-600 hover:underline">Gráficos</Link>.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Estrategia</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Ticker</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Dir.</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Precio objetivo</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Importe</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Expira en</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-800">{o.strategy.code}</span>
                      <p className="text-xs text-slate-400 truncate max-w-40">{o.strategy.name}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">{o.ticker.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${DIR_BADGE[o.direction]}`}>
                        {o.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">${o.targetPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono">${o.amount.toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        o.expiresAt.getTime() - Date.now() < 86400000 ? "text-orange-600" : "text-slate-700"
                      }`}>
                        {formatCountdown(o.expiresAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Ejecutadas ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Ejecutadas → operaciones ({executedOps.length})
        </h2>
        {executedOps.length === 0 ? (
          <p className="text-sm text-slate-400">Ninguna orden ejecutada aún.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Estrategia</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Ticker</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Dir.</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Entrada</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">PnL %</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executedOps.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {op.strategy?.code ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">{op.ticker.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${DIR_BADGE[op.direction]}`}>
                        {op.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">${op.entryPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono">
                      {op.pnlPct !== null ? (
                        <span className={op.pnlPct >= 0 ? "text-green-600" : "text-red-600"}>
                          {op.pnlPct >= 0 ? "+" : ""}{op.pnlPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">Abierta</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {op.closedAt ? `${op.closeReason} · ${formatDate(op.closedAt)}` : "Abierta"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href="/app/operations?filter=playbook" className="text-sm text-blue-600 hover:underline">
          Ver en Operaciones →
        </Link>
      </section>

      {/* ── No ejecutadas ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          No ejecutadas ({unexecutedOrders.length})
        </h2>
        {unexecutedOrders.length === 0 ? (
          <p className="text-sm text-slate-400">Ninguna orden expirada aún.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Estrategia</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Ticker</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Dir.</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Precio objetivo</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Motivo</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Expiró</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unexecutedOrders.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{u.strategy.code}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{u.ticker.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold opacity-60 ${DIR_BADGE[u.direction]}`}>
                        {u.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">${u.targetPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{u.reason}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(u.expiredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
