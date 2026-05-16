"use client"

import { useState, useTransition } from "react"

interface LogEntry {
  id: string
  action: string
  createdAt: string
  metadata: Record<string, string> | null
  actor: { username: string }
  target: { username: string }
}

const ACTION_LABELS: Record<string, string> = {
  RESET_PASSWORD: "Reset contraseña",
  DEACTIVATE:     "Desactivación",
  REACTIVATE:     "Reactivación",
  ROLE_CHANGE:    "Cambio de rol",
}

const ACTION_COLORS: Record<string, string> = {
  RESET_PASSWORD: "bg-amber-100 text-amber-700",
  DEACTIVATE:     "bg-red-100 text-red-700",
  REACTIVATE:     "bg-green-100 text-green-700",
  ROLE_CHANGE:    "bg-purple-100 text-purple-700",
}

function fmt(d: string) {
  return new Date(d).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
}

function metaLabel(action: string, meta: Record<string, string> | null) {
  if (!meta) return null
  if (action === "ROLE_CHANGE") return `${meta.from} → ${meta.to}`
  return null
}

export function AuditLogClient({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialLogs.length === 50 ? initialLogs[initialLogs.length - 1].id : null
  )
  const [loading, start] = useTransition()

  const loadMore = () => {
    if (!nextCursor) return
    start(async () => {
      const res = await fetch(`/api/admin/audit-log?cursor=${nextCursor}`)
      const data = await res.json()
      setLogs((prev) => [...prev, ...data.logs])
      setNextCursor(data.nextCursor)
    })
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-xs text-slate-500">
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Acción</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3 text-left font-medium">Objetivo</th>
              <th className="px-4 py-3 text-left font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Sin registros.</td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(l.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[l.action] ?? "bg-slate-100 text-slate-600"}`}>
                    {ACTION_LABELS[l.action] ?? l.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{l.actor.username}</td>
                <td className="px-4 py-3 text-slate-700">{l.target.username}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{metaLabel(l.action, l.metadata) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="text-center">
          <button onClick={loadMore} disabled={loading}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {loading ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}
    </div>
  )
}
