import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import JSZip from "jszip"
import { buildStrategyCsv, strategyToFilename, STRATEGY_EXPORT_SELECT } from "@/lib/playbook/export-helpers"

export async function GET() {
  await requireAdmin()

  const strategies = await prisma.strategy.findMany({
    where: { deleted: false },
    orderBy: { code: "asc" },
    select: STRATEGY_EXPORT_SELECT,
  })

  if (strategies.length === 1) {
    const s = strategies[0]
    const csv = buildStrategyCsv({ ...s, entryParams: s.entryParams as object })
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${strategyToFilename(s.code)}"`,
      },
    })
  }

  const zip = new JSZip()
  for (const s of strategies) {
    const csv = buildStrategyCsv({ ...s, entryParams: s.entryParams as object })
    zip.file(strategyToFilename(s.code), csv)
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="strategies.zip"',
    },
  })
}
