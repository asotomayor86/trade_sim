import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { buildImportPreview, type ImportFile } from "@/lib/playbook/import-validator"
import type {
  StrategySuffix, StrategyEntryRule, ExitTargetType, StopLossType,
} from "@prisma/client"

export async function POST(req: NextRequest) {
  const session = await requireAdmin()

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

  // Re-validate (never trust client)
  const [existingAnalyses, existingStrategies] = await Promise.all([
    prisma.analysis.findMany({ where: { deleted: false }, select: { id: true, code: true } }),
    prisma.strategy.findMany({ where: { deleted: false }, select: { code: true } }),
  ])

  const existingAnalysisCodes = new Set(
    existingAnalyses.map((a) => a.code).filter(Boolean) as string[]
  )
  const existingStrategyCodes = new Set(existingStrategies.map((s) => s.code))
  const currentAnalysisCount = existingAnalyses.length

  const preview = buildImportPreview(files, existingAnalysisCodes, existingStrategyCodes, currentAnalysisCount)

  if (preview.errors.length > 0 || preview.limitError) {
    return NextResponse.json(
      { error: "Hay errores de validación. Ejecuta el preview primero.", errors: preview.errors, limitError: preview.limitError },
      { status: 422 }
    )
  }

  // Build a map: analysisCode → DB id (existing + to-be-created)
  const analysisByCode = new Map(
    existingAnalyses.filter((a) => a.code).map((a) => [a.code as string, a.id])
  )

  try {
    let analysesCreated = 0
    let strategiesCreated = 0

    await prisma.$transaction(async (tx) => {
      // ---- Create analyses ----
      for (const row of preview.analysesToCreate) {
        const p = row.parsed
        const created = await tx.analysis.create({
          data: {
            code: p.code,
            name: p.name,
            descripcion: p.description || null,
            nameCustom: true,
            bias: p.bias || "NEUTRAL",
            isStandard: p.isStandard,
            userId: session.user.id,
            indicators: {
              create: (p.indicators as {
                localId?: string; type?: string; tipo?: string;
                params?: object; color?: string; lineWidth?: number; lineStyle?: number; pane?: number
              }[]).map((ind, i) => ({
                localId: ind.localId ?? crypto.randomUUID(),
                type: ind.type ?? ind.tipo ?? "EMA",
                params: (ind.params ?? {}) as object,
                color: ind.color ?? null,
                lineWidth: ind.lineWidth ?? 1,
                lineStyle: ind.lineStyle ?? 0,
                pane: ind.pane ?? 0,
              })),
            },
          },
        })
        analysisByCode.set(p.code, created.id)
        analysesCreated++
      }

      // ---- Create strategies ----
      for (const row of preview.strategiesToCreate) {
        const p = row.parsed
        const analysisId = analysisByCode.get(p.analysisCode)
        if (!analysisId) throw new Error(`analysisCode "${p.analysisCode}" no resuelto durante commit`)

        await tx.strategy.create({
          data: {
            code: p.code,
            name: p.name,
            description: p.description || null,
            analysisId,
            suffix: p.suffix as StrategySuffix,
            entryRule: p.entryRule as StrategyEntryRule,
            entryParams: p.entryParams as object,
            exitTargetType: p.exitTargetType as ExitTargetType,
            exitTargetValue: p.exitTargetValue,
            stopLossType: p.stopLossType as StopLossType,
            stopLossValue: p.stopLossValue,
            isStandard: p.isStandard,
            createdById: session.user.id,
          },
        })
        strategiesCreated++
      }
    })

    return NextResponse.json({ analysesCreated, strategiesCreated })
  } catch (e) {
    console.error("[import/commit]", e)
    return NextResponse.json({ error: `Error durante la importación: ${String(e)}` }, { status: 500 })
  }
}
