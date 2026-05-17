"use client"

import { useTransition } from "react"
import { cloneStrategy } from "@/actions/strategies"

export function CloneStrategyButton({ strategyId }: { strategyId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button onClick={() => startTransition(() => cloneStrategy(strategyId))} disabled={pending}
      className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50">
      {pending ? "Clonando…" : "Clonar"}
    </button>
  )
}
