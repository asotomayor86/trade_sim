"use client"

import { useState, useTransition, useEffect } from "react"
import { openOperation, previewOperation } from "@/actions/operations"
import type { Direction } from "@/lib/operations/pnl"

interface Ticker {
  id: string
  symbol: string
  name: string
  sector: string
  spreadOverridePct: number | null
}

interface Analysis {
  id: string
  name: string
  bias: string
  isStandard: boolean
}

interface Props {
  tickers: Ticker[]
  analyses: Analysis[]
}

interface Preview {
  entryPrice: number
  quantity: number
  spreadApplied: number
  spreadPct: number
  quoteTimestamp: Date
}

const BIAS_LABEL: Record<string, string> = {
  BULLISH: "Alcista",
  BEARISH: "Bajista",
  NEUTRAL: "Neutro",
}

export function OpenOperationModal({ tickers, analyses }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [tickerId, setTickerId] = useState("")
  const [direction, setDirection] = useState<Direction>("LONG")
  const [analysisId, setAnalysisId] = useState("")
  const [tpPrice, setTpPrice] = useState("")
  const [slPrice, setSlPrice] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const [previewing, startPreview] = useTransition()

  useEffect(() => {
    if (!tickerId) {
      setPreview(null)
      setPreviewError(null)
      return
    }
    setPreviewError(null)
    startPreview(async () => {
      try {
        const result = await previewOperation(tickerId, direction)
        setPreview(result)
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : "Error al obtener precio")
        setPreview(null)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerId, direction])

  const handleOpen = () => {
    setIsOpen(true)
    setTickerId("")
    setDirection("LONG")
    setAnalysisId("")
    setTpPrice("")
    setSlPrice("")
    setPreview(null)
    setPreviewError(null)
    setError(null)
  }

  const handleSubmit = () => {
    if (!tickerId) { setError("Selecciona un ticker"); return }
    if (!analysisId) { setError("Selecciona un análisis"); return }
    if (!preview) { setError("Espera a que se cargue la cotización"); return }
    setError(null)

    startSubmit(async () => {
      try {
        await openOperation({
          tickerId,
          analysisId,
          direction,
          tpPrice: tpPrice ? parseFloat(tpPrice) : null,
          slPrice: slPrice ? parseFloat(slPrice) : null,
        })
        setIsOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al abrir operación")
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
      >
        Nueva operación
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nueva operación</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}

            {/* Ticker */}
            <div className="space-y-1">
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

            {/* Direction */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Dirección</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDirection("LONG")}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                    direction === "LONG"
                      ? "bg-green-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ▲ Largo
                </button>
                <button
                  onClick={() => setDirection("SHORT")}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                    direction === "SHORT"
                      ? "bg-red-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ▼ Corto
                </button>
              </div>
            </div>

            {/* Price preview */}
            {tickerId && (
              <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-1.5">
                {previewing && (
                  <p className="text-slate-400 text-center py-1">Obteniendo cotización…</p>
                )}
                {previewError && !previewing && (
                  <p className="text-red-600">{previewError}</p>
                )}
                {preview && !previewing && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Precio entrada</span>
                      <span className="font-mono font-semibold">${preview.entryPrice.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cantidad</span>
                      <span className="font-mono">{preview.quantity.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Spread aplicado</span>
                      <span className="font-mono text-amber-600">{preview.spreadPct.toFixed(4)}%</span>
                    </div>
                    <div className="text-xs text-slate-400 text-right">
                      Cotización: {new Date(preview.quoteTimestamp).toLocaleTimeString("es-ES")}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Analysis */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Análisis</label>
              <select
                value={analysisId}
                onChange={(e) => setAnalysisId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecciona un análisis…</option>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.isStandard ? "★ " : ""}
                    {a.name}
                    {a.bias !== "NEUTRAL" ? ` (${BIAS_LABEL[a.bias] ?? a.bias})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* TP / SL */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  TP <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={tpPrice}
                  onChange={(e) => setTpPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="Precio objetivo"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  SL <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={slPrice}
                  onChange={(e) => setSlPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="Stop loss"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1 border-t border-slate-100">
              <button
                onClick={handleSubmit}
                disabled={submitting || previewing || !preview}
                className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? "Abriendo…" : "Abrir operación"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
