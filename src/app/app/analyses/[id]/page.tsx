import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import { AnalysisEditor } from "@/components/analyses/AnalysisEditor"
import { CloneButton } from "@/components/analyses/CloneButton"
import { DeleteButton } from "@/components/analyses/DeleteButton"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalysisDetailPage({ params }: Props) {
  await requireAuth()
  const { id } = await params

  const analysis = await prisma.analysis.findUnique({
    where: { id, deleted: false },
    select: {
      id: true,
      name: true,
      descripcion: true,
      isStandard: true,
      userId: true,
      _count: { select: { operations: true } },
      indicators: {
        orderBy: { pane: "asc" },
        select: {
          localId: true,
          type: true,
          params: true,
          color: true,
          lineWidth: true,
          lineStyle: true,
          pane: true,
        },
      },
    },
  })

  if (!analysis) notFound()

  const canDelete = analysis._count.operations === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{analysis.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            {analysis.isStandard && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                predefinido
              </span>
            )}
            <span className="text-xs text-slate-400">
              {analysis._count.operations} operación{analysis._count.operations !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CloneButton analysisId={id} />
          {canDelete && <DeleteButton analysisId={id} />}
        </div>
      </div>

      <AnalysisEditor
        analysis={{
          id: analysis.id,
          name: analysis.name,
          descripcion: analysis.descripcion,
          indicators: analysis.indicators.map((i) => ({
            localId: i.localId,
            type: i.type,
            params: i.params as Record<string, unknown>,
            color: i.color,
            lineWidth: i.lineWidth,
            lineStyle: i.lineStyle,
            pane: i.pane,
          })),
        }}
      />
    </div>
  )
}
