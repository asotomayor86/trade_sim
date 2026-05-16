import { requireAuth } from "@/lib/auth/session"

export default async function OperationsPage() {
  await requireAuth()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-slate-900">Operaciones</h1>
      <p className="text-slate-500">Disponible en Fase 5.</p>
    </div>
  )
}
