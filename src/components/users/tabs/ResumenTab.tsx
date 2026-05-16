"use client"

import Link from "next/link"

interface OpenOp {
  id: string
  direction: string
  entryPrice: number
  tpPrice: number | null
  slPrice: number | null
  openedAt: string | Date
  ticker: { symbol: string; name: string }
  analysis: { name: string }
  unrealizedPnl: number | null
  unrealizedPct: number | null
  currentPrice: number | null
}

interface Stats {
  bySector: { sector: string; count: number; avgReturn: number; winRate: number }[]
  byAnalysis: { analysisId: string; name: string; count: number; avgReturn: number; winRate: number }[]
  topTickers: { symbol: string; count: number }[]
  directionSplit: { long: number; short: number }
}

interface Props { openOps: OpenOp[]; stats: Stats }

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function PnlCell({ v, p }: { v: number | null; p: number | null }) {
  if (v === null) return <span className="text-slate-400">—</span>
  const pos = v >= 0
  return (
    <div className={`text-right ${pos ? "text-green-700" : "text-red-600"}`}>
      <div className="font-mono text-sm font-semibold">{pos ? "+" : ""}${v.toFixed(2)}</div>
      {p !== null && <div className="text-xs">{pos ? "+" : ""}{p.toFixed(2)}%</div>}
    </div>
  )
}

export function ResumenTab({ openOps, stats }: Props) {
  const total = stats.directionSplit.long + stats.directionSplit.short

  return (
    <div className="space-y-8">
      {/* Open operations */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Operaciones abiertas ({openOps.length})</h3>
        {openOps.length === 0 ? (
          <p className="text-sm text-slate-400">Sin operaciones abiertas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-medium">Ticker</th>
                  <th className="px-3 py-2 text-left font-medium">Dir.</th>
                  <th className="px-3 py-2 text-left font-medium">Análisis</th>
                  <th className="px-3 py-2 text-right font-medium">Entrada</th>
                  <th className="px-3 py-2 text-right font-medium">Actual</th>
                  <th className="px-3 py-2 text-right font-medium">PnL</th>
                  <th className="px-3 py-2 text-left font-medium">Desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {openOps.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link href={`/app/chart/${op.ticker.symbol}`} className="font-semibold text-blue-600 hover:underline">
                        {op.ticker.symbol}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        op.direction === "LONG" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {op.direction === "LONG" ? "▲" : "▼"} {op.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[150px] truncate text-slate-600">{op.analysis.name}</td>
                    <td className="px-3 py-2 text-right font-mono">${op.entryPrice.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {op.currentPrice !== null ? `$${op.currentPrice.toFixed(4)}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2"><PnlCell v={op.unrealizedPnl} p={op.unrealizedPct} /></td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmt(op.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Direction split */}
      {total > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Distribución dirección</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 rounded-full bg-slate-100 h-3 overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${(stats.directionSplit.long / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-600 whitespace-nowrap">
              ▲ {stats.directionSplit.long} LONG · {stats.directionSplit.short} SHORT ▼
            </span>
          </div>
        </section>
      )}

      {/* By sector */}
      {stats.bySector.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Retorno por sector</h3>
          <div className="space-y-1.5">
            {stats.bySector.slice(0, 6).map((s) => (
              <div key={s.sector} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate max-w-[180px]">{s.sector}</span>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{s.count} ops</span>
                  <span className={`font-mono font-semibold ${s.avgReturn >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {s.avgReturn >= 0 ? "+" : ""}{s.avgReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top tickers */}
      {stats.topTickers.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Tickers más operados</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topTickers.map((t) => (
              <Link
                key={t.symbol}
                href={`/app/chart/${t.symbol}`}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600"
              >
                {t.symbol} <span className="text-slate-400">×{t.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
