"use client"

import { useTransition } from "react"
import { deleteStrategy } from "@/actions/strategies"

export function DeleteStrategyButton({ strategyId }: { strategyId: string }) {
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm("¿Borrar esta estrategia? No se puede deshacer.")) return
    startTransition(() => deleteStrategy(strategyId))
  }

  return (
    <button onClick={handleDelete} disabled={pending}
      className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50">
      {pending ? "Borrando…" : "Borrar"}
    </button>
  )
}
