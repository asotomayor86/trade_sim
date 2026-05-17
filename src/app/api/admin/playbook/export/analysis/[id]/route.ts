import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { buildAnalysisCsv, analysisToFilename, ANALYSIS_EXPORT_SELECT } from "@/lib/playbook/export-helpers"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const a = await prisma.analysis.findUnique({ where: { id, deleted: false }, select: ANALYSIS_EXPORT_SELECT })
  if (!a) return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 })

  const csv = buildAnalysisCsv({ ...a, indicators: a.indicators as object[] })
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${analysisToFilename(a.code, a.name)}"`,
    },
  })
}
