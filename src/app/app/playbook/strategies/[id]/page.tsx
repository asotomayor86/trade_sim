import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import { StrategyEditor } from "@/components/playbook/StrategyEditor"
import { CloneStrategyButton } from "@/components/playbook/CloneStrategyButton"
import { DeleteStrategyButton } from "@/components/playbook/DeleteStrategyButton"

interface Props { params: Promise<{ id: string }> }

export default async function StrategyDetailPage({ params }: Props) {
  await requireAuth()
  const { id } = await params

  const [strategy, analyses] = await Promise.all([
    prisma.strategy.findUnique({
      where: { id, deleted: false },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.analysis.findMany({
      where: { deleted: false, code: { not: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ])

  if (!strategy) notFound()

  const canDelete = strategy._count.orders === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{strategy.code}</h1>
            {strategy.isStandard && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">predefinida</span>
            )}
          </div>
          <p className="text-sm text-slate-500">{strategy.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <CloneStrategyButton strategyId={id} />
          {canDelete && <DeleteStrategyButton strategyId={id} />}
        </div>
      </div>

      <StrategyEditor
        analyses={analyses}
        strategy={{
          id: strategy.id,
          name: strategy.name,
          description: strategy.description,
          analysisId: strategy.analysisId,
          suffix: strategy.suffix,
          entryRule: strategy.entryRule,
          entryParams: strategy.entryParams as Record<string, unknown>,
          exitTargetType: strategy.exitTargetType,
          exitTargetValue: strategy.exitTargetValue,
          stopLossType: strategy.stopLossType,
          stopLossValue: strategy.stopLossValue,
        }}
      />
    </div>
  )
}
