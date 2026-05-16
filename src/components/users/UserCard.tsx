interface UserCardProps {
  username: string
  role: string
  active: boolean
  createdAt: string | Date
  deactivatedAt?: string | Date | null
  metrics: {
    avgReturn: number
    winRate: number
    totalTrades: number
    totalPnl: number
    bestTrade: number | null
    worstTrade: number | null
  }
  isMe: boolean
}

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function UserCard({ username, role, active, createdAt, deactivatedAt, metrics, isMe }: UserCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{username}</h1>
            {isMe && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600">Tú</span>
            )}
            {!active && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Inactivo</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
              role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
            }`}>
              {role === "ADMIN" ? "Admin" : "Usuario"}
            </span>
            <span>Miembro desde {fmt(createdAt)}</span>
            {!active && deactivatedAt && (
              <span className="text-red-500">Desactivado el {fmt(deactivatedAt)}</span>
            )}
          </div>
        </div>
      </div>

      {metrics.totalTrades > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4">
          <Stat
            label="Retorno medio"
            value={`${metrics.avgReturn >= 0 ? "+" : ""}${metrics.avgReturn.toFixed(2)}%`}
            color={metrics.avgReturn >= 0 ? "text-green-700" : "text-red-600"}
          />
          <Stat label="Win rate" value={`${metrics.winRate.toFixed(0)}%`} />
          <Stat label="Ops cerradas" value={metrics.totalTrades.toString()} />
          <Stat
            label="PnL total"
            value={`${metrics.totalPnl >= 0 ? "+" : ""}$${metrics.totalPnl.toFixed(2)}`}
            color={metrics.totalPnl >= 0 ? "text-green-700" : "text-red-600"}
          />
          {metrics.bestTrade !== null && (
            <Stat label="Mejor op." value={`+${metrics.bestTrade.toFixed(2)}%`} color="text-green-700" />
          )}
          {metrics.worstTrade !== null && (
            <Stat label="Peor op." value={`${metrics.worstTrade.toFixed(2)}%`} color="text-red-600" />
          )}
        </div>
      )}
      {metrics.totalTrades === 0 && (
        <p className="text-sm text-slate-400 border-t border-slate-100 pt-4">Sin operaciones cerradas aún.</p>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold font-mono ${color ?? "text-slate-800"}`}>{value}</p>
    </div>
  )
}
