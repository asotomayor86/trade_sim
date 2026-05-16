import { requireAuth } from "@/lib/auth/session"

export default async function RankingPage() {
  await requireAuth()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-slate-900">Ranking</h1>
      <p className="text-slate-500">Disponible en Fase 7.</p>
    </div>
  )
}
