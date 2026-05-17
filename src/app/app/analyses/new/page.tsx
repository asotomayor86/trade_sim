import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import Link from "next/link"
import { AnalysisEditor } from "@/components/analyses/AnalysisEditor"

const MAX_ANALYSES = 15

export default async function NewAnalysisPage() {
  await requireAuth()

  const total = await prisma.analysis.count({ where: { deleted: false } })
  const atLimit = total >= MAX_ANALYSES

  if (atLimit) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo análisis</h1>
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Has alcanzado el límite de {MAX_ANALYSES} análisis. Borra o duplica uno existente para
          poder crear uno nuevo.
        </div>
        <Link href="/app/analyses" className="text-sm text-blue-600 hover:underline">
          ← Volver a análisis
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo análisis</h1>
        <span className="text-sm text-slate-500">{total}/{MAX_ANALYSES} análisis</span>
      </div>
      <AnalysisEditor />
    </div>
  )
}
