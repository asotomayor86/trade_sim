"use client"

import { useState, useTransition } from "react"
import { createOrder } from "@/actions/orders"
import type { StrategySummary } from "@/app/app/chart/[symbol]/page"

interface Props {
  strategy: StrategySummary
  tickerId: string
  tickerSymbol: string
  currentPrice: number | null
  onClose: () => void
}

function computeExitPrices(
  strategy: StrategySummary,
  entryPrice: number,
  direction: "LONG" | "SHORT"
): { tpLabel: string; slLabel: string } {
  const sign = direction === "LONG" ? 1 : -1

  let tpLabel: string
  if (strategy.exitTargetType === "PERCENT_GAIN") {
    const tp = entryPrice * (1 + sign * strategy.exitTargetValue / 100)
    tpLabel = `$${tp.toFixed(2)} (+${strategy.exitTargetValue}%)`
  } else {
    tpLabel = strategy.exitTargetType === "BOLLINGER_MIDDLE" ? "Media Bollinger (calculada al abrir)" : "Toque VWAP (calculado al abrir)"
  }

  let slLabel: string
  if (strategy.stopLossType === "PERCENT") {
    const sl = entryPrice * (1 - sign * strategy.stopLossValue / 100)
    slLabel = `$${sl.toFixed(2)} (-${strategy.stopLossValue}%)`
  } else {
    slLabel = "Media Bollinger (calculada al abrir)"
  }

  return { tpLabel, slLabel }
}

export function LaunchOrderModal({ strategy, tickerId, tickerSymbol, currentPrice, onClose }: Props) {
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG")
  const [targetPrice, setTargetPrice] = useState(currentPrice?.toFixed(2) ?? "")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const parsedTarget = parseFloat(targetPrice)
  const { tpLabel, slLabel } = computeExitPrices(strategy, parsedTarget || currentPrice || 0, direction)

  const handleSubmit = () => {
    const price = parseFloat(targetPrice)
    if (!price || price <= 0) { setError("Precio objetivo inválido"); return }
    setError(null)

    startTransition(async () => {
      try {
        await createOrder({ tickerId, strategyId: strategy.id, targetPrice: price, direction })
        setSuccess(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error creando orden")
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">Lanzar orden ficticia</p>
            <h2 className="font-mono text-xl font-bold text-white">{strategy.code}</h2>
            <p className="text-sm text-slate-400">{strategy.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">✕</button>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-900/40 px-4 py-3 text-sm text-emerald-400">
              Orden creada correctamente. Se ejecutará cuando {tickerSymbol} alcance el precio objetivo (válida 7 días).
            </div>
            <button onClick={onClose}
              className="w-full rounded-md bg-slate-700 py-2 text-sm text-slate-200 hover:bg-slate-600">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <p className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-400">{error}</p>}

            {/* Direction */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400 uppercase tracking-wider">Dirección</label>
              <div className="flex gap-2">
                {(["LONG", "SHORT"] as const).map((d) => (
                  <button key={d} onClick={() => setDirection(d)}
                    className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors ${
                      direction === d
                        ? d === "LONG" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Target price */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Precio objetivo de entrada
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  step={0.01}
                  min={0.01}
                  className="w-full rounded-md border border-slate-600 bg-slate-800 py-2 pl-7 pr-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              {currentPrice && (
                <p className="mt-1 text-xs text-slate-500">Precio actual: ${currentPrice.toFixed(2)}</p>
              )}
            </div>

            {/* Preview */}
            {parsedTarget > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ticker</span>
                  <span className="font-mono text-white">{tickerSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Importe</span>
                  <span className="text-white">$1.000 (fijo)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Validez</span>
                  <span className="text-white">7 días</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400">Objetivo salida</span>
                  <span className="text-emerald-400">{tpLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">Stop loss</span>
                  <span className="text-red-400">{slLabel}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSubmit} disabled={pending || !parsedTarget}
                className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                {pending ? "Lanzando…" : "Lanzar orden"}
              </button>
              <button onClick={onClose}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
