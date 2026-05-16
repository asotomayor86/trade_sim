import { requireAuth } from "@/lib/auth/session"
import { AnalysisEditor } from "@/components/analyses/AnalysisEditor"

export default async function NewAnalysisPage() {
  await requireAuth()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Nuevo análisis</h1>
      <AnalysisEditor />
    </div>
  )
}
