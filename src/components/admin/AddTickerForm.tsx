"use client"

import { useActionState, useState } from "react"
import { addTicker } from "@/actions/tickers"

export function AddTickerForm({ sectors }: { sectors: string[] }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(addTicker, null)

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          + Añadir ticker
        </button>
      ) : (
        <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          {state?.error && (
            <p className="w-full text-xs text-red-600">{state.error}</p>
          )}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Símbolo</label>
            <input
              name="symbol"
              type="text"
              required
              placeholder="AAPL"
              className="w-24 rounded border border-slate-300 px-2 py-1.5 font-mono text-sm uppercase focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Nombre</label>
            <input
              name="name"
              type="text"
              required
              placeholder="Apple Inc."
              className="w-48 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Sector</label>
            <select
              name="sector"
              required
              className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {pending ? "…" : "Añadir"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
