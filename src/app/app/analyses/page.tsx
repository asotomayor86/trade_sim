import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import Link from "next/link"
import { CloneButton } from "@/components/analyses/CloneButton"
import { DeleteButton } from "@/components/analyses/DeleteButton"

const BIAS_LABEL: Record<string, string> = {
  BULLISH: "Alcista", BEARISH: "Bajista", NEUTRAL: "Neutro",
}
const BIAS_COLOR: Record<string, string> = {
  BULLISH: "bg-green-100 text-green-700",
  BEARISH: "bg-red-100 text-red-700",
  NEUTRAL: "bg-slate-100 text-slate-600",
}

export default async function AnalysesPage() {
  const session = await requireAuth()
  const userId = session.user.id

  const [standard, mine] = await Promise.all([
    prisma.analysis.findMany({
      where: { isStandard: true, deleted: false },
      include: { indicators: true, rules: true, _count: { select: { operations: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.analysis.findMany({
      where: { userId, isStandard: false, deleted: false },
      include: { indicators: true, rules: true, _count: { select: { operations: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Análisis</h1>
        <Link
          href="/app/analyses/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          + Nuevo análisis
        </Link>
      </div>

      {/* Standard analyses */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Análisis estándar
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {standard.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 leading-snug">{a.name}</p>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${BIAS_COLOR[a.bias]}`}>
                  {BIAS_LABEL[a.bias]}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {a.indicators.length} indicador{a.indicators.length !== 1 ? "es" : ""} ·{" "}
                {a.rules.length} regla{a.rules.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/app/analyses/${a.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-500"
                >
                  Ver detalle
                </Link>
                <CloneButton analysisId={a.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My analyses */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Mis análisis {mine.length > 0 && `(${mine.length})`}
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aún no has creado ningún análisis. Crea uno nuevo o clona un estándar.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/app/analyses/${a.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-blue-600 leading-snug"
                  >
                    {a.name}
                  </Link>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${BIAS_COLOR[a.bias]}`}>
                    {BIAS_LABEL[a.bias]}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {a.indicators.length} indicador{a.indicators.length !== 1 ? "es" : ""} ·{" "}
                  {a._count.operations} op{a._count.operations !== 1 ? "eraciones" : "eración"}
                </p>
                <div className="flex gap-3">
                  <Link
                    href={`/app/analyses/${a.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500"
                  >
                    Editar
                  </Link>
                  <CloneButton analysisId={a.id} />
                  {a._count.operations === 0 && <DeleteButton analysisId={a.id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
