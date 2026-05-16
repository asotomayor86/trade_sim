"use client"

import { useState, useTransition } from "react"
import { closeOperation } from "@/actions/operations"

interface OpenOperation {
  id: string
  direction: string
  entryPrice: number
  quantity: number
  nominal: number
  tpPrice: number | null
  slPrice: number | null
  openedAt: Date
  ticker: { symbol: string; name: string }
  analysis: { name: string }
  unrealizedPnl: number | null
  unrealizedPct: number | null
  currentPrice: number | null
}

interface ClosedOperation {
  id: string
  direction: string
  entryPrice: number
  exitPrice: number | null
  nominal: number
  pnl: number | null
  pnlPct: number | null
  closeReason: string | null
  openedAt: Date
  closedAt: Date | null
  ticker: { symbol: string; name: string }
  analysis: { name: string }
}

interface Props {
  open: OpenOperation[]
  closed: ClosedOperation[]
}

function fmt(d: Date | string) {
  const dt = new Date(d)
  return dt.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })
    + " " + dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function PnlCell({ value, pct }: { value: number | null; pct: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>
  const pos = value >= 0
  return (
    <div className={`text-right ${pos ? "text-green-700" : "text-red-600"}`}>
      <div className="font-mono text-sm font-semibold">
        {pos ? "+" : ""}${value.toFixed(2)}
      </div>
      {pct !== null && (
        <div className="text-xs">{pos ? "+" : ""}{pct.toFixed(2)}%</div>
      )}
    </div>
  )
}

function DirectionBadge({ dir }: { dir: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
      dir === "LONG" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}>
      {dir === "LONG" ? "▲ Largo" : "▼ Corto"}
    </span>
  )
}

function CloseButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="text-right">
      <button
        onClick={() => {
          if (!confirm("¿Cerrar esta operación al precio actual?")) return
          start(async () => {
            try {
              await closeOperation(id, "MANUAL")
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Error")
            }
          })
        }}
        disabled={pending}
        className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
      >
        {pending ? "…" : "Cerrar"}
      </button>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  )
}

function closeReasonLabel(r: string | null) {
  if (r === "TP") return "TP"
  if (r === "SL") return "SL"
  if (r === "ALERT") return "Alerta"
  return "Manual"
}

export function OperationsTable({ open, closed }: Props) {
  const [tab, setTab] = useState<"open" | "closed">("open")

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-slate-500 hover:text-slate-700"
    }`

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => setTab("open")} className={tabCls(tab === "open")}>
          Abiertas
          {open.length > 0 && (
            <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {open.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab("closed")} className={tabCls(tab === "closed")}>
          Cerradas
          {closed.length > 0 && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {closed.length}
            </span>
          )}
        </button>
      </div>

      {tab === "open" && (
        open.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No hay operaciones abiertas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">Ticker</th>
                  <th className="px-4 py-3 text-left font-medium">Dir.</th>
                  <th className="px-4 py-3 text-left font-medium">Análisis</th>
                  <th className="px-4 py-3 text-right font-medium">Entrada</th>
                  <th className="px-4 py-3 text-right font-medium">Actual</th>
                  <th className="px-4 py-3 text-right font-medium">PnL no realizado</th>
                  <th className="px-4 py-3 text-right font-medium">TP / SL</th>
                  <th className="px-4 py-3 text-left font-medium">Apertura</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {open.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{op.ticker.symbol}</td>
                    <td className="px-4 py-3"><DirectionBadge dir={op.direction} /></td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-slate-600">{op.analysis.name}</td>
                    <td className="px-4 py-3 text-right font-mono">${op.entryPrice.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {op.currentPrice !== null
                        ? <>${op.currentPrice.toFixed(4)}</>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <PnlCell value={op.unrealizedPnl} pct={op.unrealizedPct} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 space-y-0.5">
                      <div>{op.tpPrice ? `TP $${op.tpPrice.toFixed(2)}` : "—"}</div>
                      <div>{op.slPrice ? `SL $${op.slPrice.toFixed(2)}` : "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(op.openedAt)}</td>
                    <td className="px-4 py-3"><CloseButton id={op.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "closed" && (
        closed.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No hay operaciones cerradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">Ticker</th>
                  <th className="px-4 py-3 text-left font-medium">Dir.</th>
                  <th className="px-4 py-3 text-left font-medium">Análisis</th>
                  <th className="px-4 py-3 text-right font-medium">Entrada</th>
                  <th className="px-4 py-3 text-right font-medium">Salida</th>
                  <th className="px-4 py-3 text-right font-medium">PnL</th>
                  <th className="px-4 py-3 text-left font-medium">Razón</th>
                  <th className="px-4 py-3 text-left font-medium">Cierre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closed.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{op.ticker.symbol}</td>
                    <td className="px-4 py-3"><DirectionBadge dir={op.direction} /></td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-slate-600">{op.analysis.name}</td>
                    <td className="px-4 py-3 text-right font-mono">${op.entryPrice.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {op.exitPrice !== null ? `$${op.exitPrice.toFixed(4)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PnlCell value={op.pnl} pct={op.pnlPct} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{closeReasonLabel(op.closeReason)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {op.closedAt ? fmt(op.closedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
