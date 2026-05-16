"use client"

import { useState, useTransition } from "react"
import { createAlert, dismissAlert } from "@/actions/alerts"
import type { AlertOp } from "@/lib/alerts/evaluator"

interface Ticker {
  id: string
  symbol: string
  name: string
}

interface Alert {
  id: string
  tickerId: string | null
  condition: unknown
  message: string | null
  active: boolean
  triggeredAt: Date | null
  createdAt: Date
  ticker: { symbol: string; name: string } | null
}

type AlertCond = { indicator: "PRICE"; op: AlertOp; value: number }

function parseCondition(c: unknown): AlertCond | null {
  if (typeof c !== "object" || !c) return null
  const cond = c as Record<string, unknown>
  if (cond.indicator === "PRICE" && typeof cond.value === "number") {
    return { indicator: "PRICE", op: cond.op as AlertOp, value: cond.value }
  }
  return null
}

const OP_LABELS: Record<AlertOp, string> = {
  ">=": "≥ (mayor o igual)",
  "<=": "≤ (menor o igual)",
  ">": "> (mayor que)",
  "<": "< (menor que)",
}

export function AlertsClient({ tickers, alerts }: { tickers: Ticker[]; alerts: Alert[] }) {
  const [tickerId, setTickerId] = useState("")
  const [op, setOp] = useState<AlertOp>(">=")
  const [value, setValue] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [creating, startCreate] = useTransition()

  const handleCreate = () => {
    if (!tickerId) { setError("Selecciona un ticker"); return }
    const v = parseFloat(value)
    if (!value || isNaN(v) || v <= 0) { setError("Introduce un precio válido"); return }
    setError(null)

    startCreate(async () => {
      try {
        await createAlert({
          tickerId,
          condition: { indicator: "PRICE", op, value: v },
          message: message.trim() || undefined,
        })
        setTickerId("")
        setValue("")
        setMessage("")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear alerta")
      }
    })
  }

  const activeAlerts = alerts.filter((a) => a.active)
  const triggeredAlerts = alerts.filter((a) => !a.active && a.triggeredAt)
  const dismissedAlerts = alerts.filter((a) => !a.active && !a.triggeredAt)

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Create form */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Nueva alerta</h2>

        {error && (
          <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="block text-sm font-medium text-slate-700">Ticker</label>
            <select
              value={tickerId}
              onChange={(e) => setTickerId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un ticker…</option>
              {tickers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol} – {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Condición</label>
            <select
              value={op}
              onChange={(e) => setOp(e.target.value as AlertOp)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {(Object.entries(OP_LABELS) as [AlertOp, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Precio ($)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              step="0.01"
              min="0"
              placeholder="150.00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Nota <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej. Soporte clave"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {creating ? "Creando…" : "Crear alerta"}
        </button>
      </div>

      {/* Active alerts */}
      <AlertSection title="Activas" alerts={activeAlerts} showDismiss />

      {/* Triggered */}
      {triggeredAlerts.length > 0 && (
        <AlertSection title="Disparadas" alerts={triggeredAlerts} />
      )}

      {/* Dismissed */}
      {dismissedAlerts.length > 0 && (
        <AlertSection title="Desactivadas" alerts={dismissedAlerts} />
      )}
    </div>
  )
}

function AlertSection({
  title,
  alerts,
  showDismiss,
}: {
  title: string
  alerts: Alert[]
  showDismiss?: boolean
}) {
  if (alerts.length === 0 && title === "Activas") {
    return (
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-400">No hay alertas activas.</p>
      </div>
    )
  }
  if (alerts.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-slate-800">{title}</h2>
      <div className="space-y-2">
        {alerts.map((a) => (
          <AlertRow key={a.id} alert={a} showDismiss={showDismiss} />
        ))}
      </div>
    </div>
  )
}

function AlertRow({ alert, showDismiss }: { alert: Alert; showDismiss?: boolean }) {
  const [pending, start] = useTransition()
  const cond = parseCondition(alert.condition)

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">
            {alert.ticker?.symbol ?? "—"}
          </span>
          {cond && (
            <span className="text-sm text-slate-600">
              precio {cond.op} ${cond.value.toFixed(2)}
            </span>
          )}
        </div>
        {alert.message && (
          <p className="text-xs text-slate-500">{alert.message}</p>
        )}
        {alert.triggeredAt && (
          <p className="text-xs text-green-600">
            Disparada: {new Date(alert.triggeredAt).toLocaleString("es-ES")}
          </p>
        )}
      </div>

      {showDismiss && (
        <button
          onClick={() => start(() => dismissAlert(alert.id))}
          disabled={pending}
          className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {pending ? "…" : "Desactivar"}
        </button>
      )}
    </div>
  )
}
