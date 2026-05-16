"use client"

import { useState } from "react"
import { ResumenTab } from "./tabs/ResumenTab"
import { HistoricoTab } from "./tabs/HistoricoTab"
import { AnalisisTab } from "./tabs/AnalisisTab"
import { AjustesTab } from "./tabs/AjustesTab"

type Mode = "self" | "admin" | "other"
type Tab = "resumen" | "historico" | "analisis" | "ajustes"

interface Props {
  mode: Mode
  userId: string
  username: string
  active: boolean
  role: string
  openOps: Parameters<typeof ResumenTab>[0]["openOps"]
  stats: Parameters<typeof ResumenTab>[0]["stats"]
  pushSubs?: Parameters<typeof AjustesTab>[0]["pushSubs"]
}

export function UserTabs({ mode, userId, username, active, role, openOps, stats, pushSubs }: Props) {
  const [tab, setTab] = useState<Tab>("resumen")

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "resumen",   label: "Resumen",   show: true },
    { key: "historico", label: "Histórico", show: true },
    { key: "analisis",  label: "Análisis",  show: true },
    { key: "ajustes",   label: "Ajustes",   show: mode !== "other" },
  ]

  const cls = (key: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === key
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-slate-500 hover:text-slate-700"
    }`

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cls(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <ResumenTab openOps={openOps} stats={stats} />}
      {tab === "historico" && <HistoricoTab userId={userId} />}
      {tab === "analisis" && <AnalisisTab byAnalysis={stats.byAnalysis} directionSplit={stats.directionSplit} />}
      {tab === "ajustes" && mode !== "other" && (
        <AjustesTab
          mode={mode}
          targetId={userId}
          targetUsername={username}
          targetActive={active}
          targetRole={role}
          pushSubs={pushSubs}
        />
      )}
    </div>
  )
}
