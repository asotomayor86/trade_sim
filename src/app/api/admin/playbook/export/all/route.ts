import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import JSZip from "jszip"
import {
  buildAnalysisCsv, analysisToFilename, ANALYSIS_EXPORT_SELECT,
  buildStrategyCsv, strategyToFilename, STRATEGY_EXPORT_SELECT,
} from "@/lib/playbook/export-helpers"

export async function GET() {
  await requireAdmin()

  const [analyses, strategies] = await Promise.all([
    prisma.analysis.findMany({ where: { deleted: false }, orderBy: { name: "asc" }, select: ANALYSIS_EXPORT_SELECT }),
    prisma.strategy.findMany({ where: { deleted: false }, orderBy: { code: "asc" }, select: STRATEGY_EXPORT_SELECT }),
  ])

  const zip = new JSZip()

  for (const a of analyses) {
    zip.file(analysisToFilename(a.code, a.name), buildAnalysisCsv({ ...a, indicators: a.indicators as object[] }))
  }
  for (const s of strategies) {
    zip.file(strategyToFilename(s.code), buildStrategyCsv({ ...s, entryParams: s.entryParams as object }))
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="playbook.zip"',
    },
  })
}
