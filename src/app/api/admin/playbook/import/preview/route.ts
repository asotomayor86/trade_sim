import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { buildImportPreview, type ImportFile } from "@/lib/playbook/import-validator"

export async function POST(req: NextRequest) {
  await requireAdmin()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 })
  }

  const files: ImportFile[] = []
  for (const [, value] of formData.entries()) {
    if (!(value instanceof File)) continue
    const content = await value.text()
    files.push({ filename: value.name, content })
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 })
  }

  // Load existing codes from DB
  const [existingAnalyses, existingStrategies] = await Promise.all([
    prisma.analysis.findMany({ where: { deleted: false }, select: { code: true } }),
    prisma.strategy.findMany({ where: { deleted: false }, select: { code: true } }),
  ])

  const existingAnalysisCodes = new Set(
    existingAnalyses.map((a) => a.code).filter(Boolean) as string[]
  )
  const existingStrategyCodes = new Set(existingStrategies.map((s) => s.code))
  const currentAnalysisCount = existingAnalyses.length

  const preview = buildImportPreview(files, existingAnalysisCodes, existingStrategyCodes, currentAnalysisCount)

  return NextResponse.json(preview)
}
