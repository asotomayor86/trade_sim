"use client"

import { useTransition } from "react"
import { deleteAnalysis } from "@/actions/analyses"

export function DeleteButton({ analysisId }: { analysisId: string }) {
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm("¿Borrar este análisis? No se puede deshacer.")) return
    startTransition(() => deleteAnalysis(analysisId))
  }

  return (
    <button
      disabled={pending}
      onClick={handleDelete}
      className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? "Borrando…" : "Borrar"}
    </button>
  )
}
