import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import Link from "next/link"
import { CloneButton } from "@/components/analyses/CloneButton"
import { DeleteButton } from "@/components/analyses/DeleteButton"

const MAX_ANALYSES = 15

export default async function AnalysesPage() {
  await requireAuth()

  const analyses = await prisma.analysis.findMany({
    where: { deleted: false },
    include: {
      indicators: true,
      _count: { select: { operations: true } },
    },
    orderBy: { name: "asc" },
  })

  const total = analyses.length
  const atLimit = total >= MAX_ANALYSES

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análisis</h1>
          <p className={`text-sm font-medium ${atLimit ? "text-red-600" : "text-slate-500"}`}>
            {total}/{MAX_ANALYSES} análisis
          </p>
        </div>
        {atLimit ? (
          <span className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
            Límite alcanzado
          </span>
        ) : (
          <Link
            href="/app/analyses/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            + Nuevo análisis
          </Link>
        )}
      </div>

      {/* List */}
      {analyses.length === 0 ? (
        <p className="text-sm text-slate-400">
          No hay análisis creados aún.{" "}
          <Link href="/app/analyses/new" className="text-blue-600 hover:underline">
            Crea el primero.
          </Link>
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/app/analyses/${a.id}`}
                  className="text-sm font-semibold leading-snug text-slate-900 hover:text-blue-600"
                >
                  {a.name}
                </Link>
                {a.isStandard && (
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    predefinido
                  </span>
                )}
              </div>

              {a.descripcion && (
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{a.descripcion}</p>
              )}

              <p className="text-xs text-slate-400">
                {a.indicators.length} indicador{a.indicators.length !== 1 ? "es" : ""} ·{" "}
                {a._count.operations} operación{a._count.operations !== 1 ? "es" : ""}
              </p>

              {/* Indicator type chips */}
              {a.indicators.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {a.indicators.slice(0, 5).map((ind) => (
                    <span
                      key={ind.id}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      style={{ borderLeft: `3px solid ${ind.color ?? "#94a3b8"}` }}
                    >
                      {ind.type}
                    </span>
                  ))}
                  {a.indicators.length > 5 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                      +{a.indicators.length - 5}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-3 border-t border-slate-100 pt-2">
                <Link href={`/app/analyses/${a.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-500">
                  Editar
                </Link>
                <CloneButton analysisId={a.id} />
                {a._count.operations === 0 && <DeleteButton analysisId={a.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
