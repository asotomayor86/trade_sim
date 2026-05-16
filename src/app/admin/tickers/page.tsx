import { requireAdmin } from "@/lib/auth/session"

export default async function TickersPage() {
  await requireAdmin()
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-slate-900">Tickers</h1>
      <p className="text-slate-500">Disponible en Fase 2.</p>
    </div>
  )
}
