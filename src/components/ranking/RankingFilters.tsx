"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SECTORS } from "@/lib/scoring/metrics"

interface Analysis {
  id: string
  name: string
}

interface Props {
  analyses: Analysis[]
}

const PERIODS = [
  { value: "all", label: "Todo el tiempo" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "7d", label: "Últimos 7 días" },
]

export function RankingFilters({ analyses }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const current = {
    period: searchParams.get("period") ?? "all",
    sector: searchParams.get("sector") ?? "",
    analysisId: searchParams.get("analysisId") ?? "",
  }

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/app/ranking?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={current.period}
        onChange={(e) => update("period", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <select
        value={current.sector}
        onChange={(e) => update("sector", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Todos los sectores</option>
        {SECTORS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={current.analysisId}
        onChange={(e) => update("analysisId", e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Todos los análisis</option>
        {analyses.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {(current.period !== "all" || current.sector || current.analysisId) && (
        <button
          onClick={() => router.push("/app/ranking")}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
