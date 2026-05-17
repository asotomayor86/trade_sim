import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { buildStrategyCsv, strategyToFilename, STRATEGY_EXPORT_SELECT } from "@/lib/playbook/export-helpers"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const s = await prisma.strategy.findUnique({ where: { id, deleted: false }, select: STRATEGY_EXPORT_SELECT })
  if (!s) return NextResponse.json({ error: "Estrategia no encontrada" }, { status: 404 })

  const csv = buildStrategyCsv({ ...s, entryParams: s.entryParams as object })
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${strategyToFilename(s.code)}"`,
    },
  })
}
