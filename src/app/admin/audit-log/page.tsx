import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AuditLogClient } from "@/components/admin/AuditLogClient"

export default async function AuditLogPage() {
  await requireAdmin()

  const logs = await prisma.userAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { username: true } },
      target: { select: { username: true } },
    },
  })

  const serialized = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    metadata: l.metadata as Record<string, string> | null,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Auditoría de usuarios</h1>
      <AuditLogClient initialLogs={serialized} />
    </div>
  )
}
