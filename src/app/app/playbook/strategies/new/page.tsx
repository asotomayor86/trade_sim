import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { StrategyEditor } from "@/components/playbook/StrategyEditor"

export default async function NewStrategyPage() {
  await requireAuth()

  const analyses = await prisma.analysis.findMany({
    where: { deleted: false, code: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Nueva estrategia</h1>
      <StrategyEditor analyses={analyses} />
    </div>
  )
}
