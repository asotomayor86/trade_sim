"use client"

interface AnalysisRow {
  analysisId: string
  name: string
  count: number
  avgReturn: number
  winRate: number
}

interface Props {
  byAnalysis: AnalysisRow[]
  directionSplit: { long: number; short: number }
}

export function AnalisisTab({ byAnalysis, directionSplit }: Props) {
  if (byAnalysis.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sin operaciones cerradas para analizar.</p>
  }

  const total = directionSplit.long + directionSplit.short

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-xs text-slate-500">
              <th className="px-4 py-3 text-left font-medium">Análisis</th>
              <th className="px-4 py-3 text-right font-medium">Ops</th>
              <th className="px-4 py-3 text-right font-medium">Retorno medio</th>
              <th className="px-4 py-3 text-right font-medium">Win rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byAnalysis.map((a) => (
              <tr key={a.analysisId} className="hover:bg-slate-50">
                <td className="px-4 py-3 max-w-[240px] truncate text-slate-700 font-medium">{a.name}</td>
                <td className="px-4 py-3 text-right text-slate-600">{a.count}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${a.avgReturn >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {a.avgReturn >= 0 ? "+" : ""}{a.avgReturn.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{a.winRate.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Distribución LONG / SHORT</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-full bg-slate-100 h-2.5 overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${(directionSplit.long / total) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {directionSplit.long}L · {directionSplit.short}S
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
