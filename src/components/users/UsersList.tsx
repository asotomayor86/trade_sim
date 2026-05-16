"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

interface UserRow {
  id: string
  username: string
  role: string
  active: boolean
  totalTrades: number
  avgReturn: number | null
  winRate: number | null
  lastOpAt: string | null
}

const SORTS = [
  { value: "ranking", label: "Por ranking" },
  { value: "alpha",   label: "Alfabético" },
  { value: "ops",     label: "Nº operaciones" },
  { value: "recent",  label: "Más recientes" },
]

function pct(n: number | null) {
  if (n === null) return "—"
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`
}

export function UsersList({ users, isAdmin }: { users: UserRow[]; isAdmin: boolean }) {
  const router = useRouter()
  const sp = useSearchParams()
  const sort = sp.get("sort") ?? "ranking"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Ordenar por:</span>
        <select
          value={sort}
          onChange={(e) => router.push(`/app/users?sort=${e.target.value}`)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-xs text-slate-500">
              <th className="px-4 py-3 text-left font-medium">Usuario</th>
              <th className="px-4 py-3 text-left font-medium">Rol</th>
              <th className="px-4 py-3 text-right font-medium">Retorno medio</th>
              <th className="px-4 py-3 text-right font-medium">Win rate</th>
              <th className="px-4 py-3 text-right font-medium">Ops cerradas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr
                key={u.id}
                className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                  !u.active && isAdmin ? "opacity-50" : ""
                }`}
                onClick={() => router.push(`/app/users/${u.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!u.active ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {u.username}
                    </span>
                    {!u.active && isAdmin && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">inactivo</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {u.role === "ADMIN" ? "Admin" : "Usuario"}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-mono ${
                  u.avgReturn === null ? "text-slate-400"
                  : u.avgReturn >= 0 ? "text-green-700" : "text-red-600"
                }`}>
                  {pct(u.avgReturn)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">
                  {u.winRate !== null ? `${u.winRate.toFixed(0)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{u.totalTrades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Métricas visibles solo para usuarios con ≥5 operaciones cerradas.
      </p>
    </div>
  )
}
