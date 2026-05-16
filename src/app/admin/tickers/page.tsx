import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AddTickerForm } from "@/components/admin/AddTickerForm"
import { TickerActions } from "@/components/admin/TickerActions"

const SECTORS = [
  "Information Technology",
  "Health Care",
  "Financials",
  "Consumer Discretionary",
  "Communication Services",
  "Industrials",
  "Consumer Staples",
  "Energy",
  "Utilities",
  "Real Estate",
  "Materials",
  "ETF",
]

export default async function TickersPage() {
  await requireAdmin()

  const tickers = await prisma.ticker.findMany({
    orderBy: [{ active: "desc" }, { sector: "asc" }, { symbol: "asc" }],
  })

  const active = tickers.filter((t) => t.active)
  const inactive = tickers.filter((t) => !t.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Universo de tickers</h1>
          <p className="text-sm text-slate-500">{active.length} activos · {inactive.length} inactivos</p>
        </div>
      </div>

      <AddTickerForm sectors={SECTORS} />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Símbolo</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Sector</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Spread %</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickers.map((ticker) => (
              <tr key={ticker.id} className={!ticker.active ? "opacity-40" : ""}>
                <td className="px-4 py-2 font-mono font-semibold text-slate-900">{ticker.symbol}</td>
                <td className="px-4 py-2 text-slate-700">{ticker.name}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{ticker.sector}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">
                  {ticker.spreadOverridePct != null ? `${ticker.spreadOverridePct}%` : "auto"}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    ticker.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {ticker.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <TickerActions symbol={ticker.symbol} active={ticker.active} />
                </td>
              </tr>
            ))}
            {tickers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No hay tickers. Añade el primero o importa el seed inicial.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
