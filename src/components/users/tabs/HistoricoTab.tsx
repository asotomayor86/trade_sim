"use client"

import { useState, useTransition } from "react"
import { SECTORS } from "@/lib/scoring/metrics"

interface ClosedOp {
  id: string
  direction: string
  entryPrice: number
  exitPrice: number | null
  pnl: number | null
  pnlPct: number | null
  closeReason: string | null
  openedAt: string
  closedAt: string | null
  ticker: { symbol: string; name: string; sector: string }
  analysis: { name: string }
}

interface Props { userId: string }

function fmt(d: string | null) {
  if (!d) return "—"
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

export function HistoricoTab({ userId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [ops, setOps] = useState<ClosedOp[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [sector, setSector] = useState("")
  const [analysisFilter, setAnalysisFilter] = useState("")
  const [loading, startLoad] = useTransition()

  async function load(cursor?: string, newSector?: string, newAnalysis?: string) {
    const params = new URLSearchParams({ status: "closed", limit: "20" })
    if (cursor) params.set("cursor", cursor)
    const s = newSector ?? sector
    const a = newAnalysis ?? analysisFilter
    if (s) params.set("sector", s)
    if (a) params.set("analysisId", a)

    const res = await fetch(`/api/users/${userId}/operations?${params}`)
    const data = await res.json()

    if (cursor) {
      setOps((prev) => [...prev, ...data.ops])
    } else {
      setOps(data.ops)
    }
    setNextCursor(data.nextCursor)
  }

  function handleExpand() {
    setExpanded(true)
    startLoad(() => load())
  }

  function handleFilter(newSector: string, newAnalysis: string) {
    setSector(newSector)
    setAnalysisFilter(newAnalysis)
    startLoad(() => load(undefined, newSector, newAnalysis))
  }

  if (!expanded) {
    return (
      <div className="py-6 text-center">
        <button
          onClick={handleExpand}
          className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Ver histórico de operaciones cerradas
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={sector}
          onChange={(e) => handleFilter(e.target.value, analysisFilter)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los sectores</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(sector || analysisFilter) && (
          <button
            onClick={() => handleFilter("", "")}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400">Cargando…</p>}

      {!loading && ops.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">Sin operaciones cerradas con estos filtros.</p>
      )}

      {ops.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500">
                <th className="px-3 py-2 text-left font-medium">Ticker</th>
                <th className="px-3 py-2 text-left font-medium">Dir.</th>
                <th className="px-3 py-2 text-left font-medium">Análisis</th>
                <th className="px-3 py-2 text-right font-medium">Entrada</th>
                <th className="px-3 py-2 text-right font-medium">Salida</th>
                <th className="px-3 py-2 text-right font-medium">PnL</th>
                <th className="px-3 py-2 text-left font-medium">Razón</th>
                <th className="px-3 py-2 text-left font-medium">Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ops.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold">{op.ticker.symbol}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                      op.direction === "LONG" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {op.direction === "LONG" ? "▲" : "▼"}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[140px] truncate text-slate-600">{op.analysis.name}</td>
                  <td className="px-3 py-2 text-right font-mono">${op.entryPrice.toFixed(4)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {op.exitPrice !== null ? `$${op.exitPrice.toFixed(4)}` : "—"}
                  </td>
                  <td className="px-3 py-2"><PnlCell v={op.pnl} p={op.pnlPct} /></td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{op.closeReason ?? "Manual"}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmt(op.closedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && !loading && (
        <div className="text-center">
          <button
            onClick={() => startLoad(() => load(nextCursor))}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cargar más
          </button>
        </div>
      )}
    </div>
  )
}
