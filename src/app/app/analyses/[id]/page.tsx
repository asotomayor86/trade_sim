import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import { AnalysisEditor } from "@/components/analyses/AnalysisEditor"
import { CloneButton } from "@/components/analyses/CloneButton"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalysisDetailPage({ params }: Props) {
  const session = await requireAuth()
  const { id } = await params

  const analysis = await prisma.analysis.findUnique({
    where: { id, deleted: false },
    include: { indicators: true, rules: true },
  })

  if (!analysis) notFound()

  const isOwner = analysis.userId === session.user.id
  const canEdit = isOwner && !analysis.isStandard

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{analysis.name}</h1>
          {analysis.isStandard && (
            <p className="text-sm text-slate-500">Análisis estándar · solo lectura</p>
          )}
        </div>
        {!canEdit && <CloneButton analysisId={id} label="Clonar y editar" />}
      </div>

      <AnalysisEditor
        analysis={canEdit ? analysis : null}
        readonlyData={!canEdit ? analysis : null}
      />
    </div>
  )
}
