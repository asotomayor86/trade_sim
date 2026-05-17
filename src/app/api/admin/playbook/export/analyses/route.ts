import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import JSZip from "jszip"
import { buildAnalysisCsv, analysisToFilename, ANALYSIS_EXPORT_SELECT } from "@/lib/playbook/export-helpers"

export async function GET() {
  await requireAdmin()

  const analyses = await prisma.analysis.findMany({
    where: { deleted: false },
    orderBy: { name: "asc" },
    select: ANALYSIS_EXPORT_SELECT,
  })

  if (analyses.length === 1) {
    const a = analyses[0]
    const csv = buildAnalysisCsv({ ...a, indicators: a.indicators as object[] })
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${analysisToFilename(a.code, a.name)}"`,
      },
    })
  }

  const zip = new JSZip()
  for (const a of analyses) {
    const csv = buildAnalysisCsv({ ...a, indicators: a.indicators as object[] })
    zip.file(analysisToFilename(a.code, a.name), csv)
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="analyses.zip"',
    },
  })
}
