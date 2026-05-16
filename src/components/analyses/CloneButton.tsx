"use client"

import { useTransition } from "react"
import { cloneAnalysis } from "@/actions/analyses"

export function CloneButton({
  analysisId,
  label = "Clonar",
}: {
  analysisId: string
  label?: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => cloneAnalysis(analysisId))}
      className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
    >
      {pending ? "Clonando…" : label}
    </button>
  )
}
