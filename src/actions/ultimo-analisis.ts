"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import type { IndicatorTipo, IndicatorConfig } from "@/lib/indicators/engine"

export interface LastAppliedResult {
  analysisId: string
  analysisName: string
  indicators: IndicatorConfig[]
}

function toIndicatorConfig(ind: {
  localId: string
  type: string
  params: unknown
  color: string | null
  lineWidth: number
  lineStyle: number
  pane: number
}): IndicatorConfig {
  const params = (ind.params ?? {}) as Record<string, unknown>
  const panel: "overlay" | "sub" = ind.pane === 0 ? "overlay" : "sub"
  return {
    localId: ind.localId,
    tipo: ind.type as IndicatorTipo,
    params,
    panel,
    visual: {
      color: ind.color ?? "#f59e0b",
      lineWidth: ind.lineWidth,
      lineStyle: ind.lineStyle,
    },
  }
}

export async function getLastApplied(tickerId: string): Promise<LastAppliedResult | null> {
  const session = await requireAuth()

  const record = await prisma.ultimoAnalisisAplicado.findUnique({
    where: { userId_tickerId: { userId: session.user.id, tickerId } },
    include: {
      analysis: {
        include: { indicators: { orderBy: { pane: "asc" } } },
      },
    },
  })

  if (!record) return null

  // Fallback silencioso: analysis borrado
  if (record.analysis.deleted) {
    await prisma.ultimoAnalisisAplicado.delete({
      where: { userId_tickerId: { userId: session.user.id, tickerId } },
    })
    return null
  }

  return {
    analysisId: record.analysisId,
    analysisName: record.analysis.name,
    indicators: record.analysis.indicators.map(toIndicatorConfig),
  }
}

export async function applyAnalysis(tickerId: string, analysisId: string): Promise<void> {
  const session = await requireAuth()

  // Verify analysis exists and is not deleted
  const analysis = await prisma.analysis.findUnique({ where: { id: analysisId, deleted: false } })
  if (!analysis) throw new Error("Análisis no encontrado")

  await prisma.ultimoAnalisisAplicado.upsert({
    where: { userId_tickerId: { userId: session.user.id, tickerId } },
    create: { userId: session.user.id, tickerId, analysisId },
    update: { analysisId, appliedAt: new Date() },
  })
}

export async function removeLastApplied(tickerId: string): Promise<void> {
  const session = await requireAuth()

  await prisma.ultimoAnalisisAplicado.deleteMany({
    where: { userId: session.user.id, tickerId },
  })
}
