import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import Link from "next/link"
import { DeleteStrategyButton } from "@/components/playbook/DeleteStrategyButton"
import { CloneStrategyButton } from "@/components/playbook/CloneStrategyButton"

const SUFFIX_BADGE: Record<string, string> = {
  LONG: "bg-green-100 text-green-700",
  SHORT: "bg-red-100 text-red-700",
  BNC: "bg-blue-100 text-blue-700",
  UP: "bg-emerald-100 text-emerald-700",
  DN: "bg-orange-100 text-orange-700",
}

const EXIT_LABEL: Record<string, string> = {
  PERCENT_GAIN: "% ganancia",
  BOLLINGER_MIDDLE: "BB media",
  VWAP_TOUCH: "Toque VWAP",
}

const SL_LABEL: Record<string, string> = {
  PERCENT: "% pérdida",
  BOLLINGER_MIDDLE: "BB media",
}

export default async function StrategiesPage() {
  await requireAuth()

  const strategies = await prisma.strategy.findMany({
    where: { deleted: false },
    include: { analysis: { select: { name: true, code: true } }, _count: { select: { orders: true } } },
    orderBy: { code: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">ESTRATEGIAS</h1>
        <Link href="/app/playbook/strategies/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          + Nueva estrategia
        </Link>
      </div>

      {strategies.length === 0 ? (
        <p className="text-sm text-slate-400">
          No hay estrategias aún.{" "}
          <Link href="/app/playbook/strategies/new" className="text-blue-600 hover:underline">Crea la primera.</Link>
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Código</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="px-4 py-3 font-semibold text-slate-600">ANÁLISIS</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Objetivo</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Stop</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Órdenes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {strategies.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{s.code}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SUFFIX_BADGE[s.suffix] ?? "bg-slate-100 text-slate-600"}`}>
                        {s.suffix}
                      </span>
                      {s.isStandard && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">std</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/app/playbook/strategies/${s.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {s.name}
                    </Link>
                    {s.description && <p className="truncate text-xs text-slate-400 max-w-48">{s.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.analysis.code && <span className="font-mono text-xs text-slate-400">[{s.analysis.code}] </span>}
                    {s.analysis.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {EXIT_LABEL[s.exitTargetType]}
                    {s.exitTargetType === "PERCENT_GAIN" && ` ${s.exitTargetValue}%`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {SL_LABEL[s.stopLossType]}
                    {s.stopLossType === "PERCENT" && ` ${s.stopLossValue}%`}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s._count.orders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/app/playbook/strategies/${s.id}`} className="text-xs text-blue-600 hover:text-blue-500">Editar</Link>
                      <CloneStrategyButton strategyId={s.id} />
                      {s._count.orders === 0 && <DeleteStrategyButton strategyId={s.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
