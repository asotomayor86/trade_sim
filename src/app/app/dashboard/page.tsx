import { requireAuth } from "@/lib/auth/session"

export default async function DashboardPage() {
  const session = await requireAuth()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">
        Bienvenido, {session.user.name}
      </h1>
      <p className="text-slate-500">
        Plataforma de trading educativo · Fase 1 completada
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Operaciones abiertas", value: "—" },
          { label: "Retorno medio", value: "—" },
          { label: "Win rate", value: "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
