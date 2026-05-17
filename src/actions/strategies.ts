"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { generateStrategyCode } from "@/lib/playbook/codes"
import type { StrategySuffix, StrategyEntryRule, ExitTargetType, StopLossType } from "@prisma/client"

// ---- Zod schema ----

const strategySchema = z.object({
  name:             z.string().min(1).max(120),
  description:      z.string().max(500).optional(),
  analysisId:       z.string().cuid(),
  suffix:           z.enum(["LONG", "SHORT", "BNC", "UP", "DN"]),
  entryRule:        z.enum(["EMA_CROSS_UP", "EMA_CROSS_DOWN", "RSI_OVERSOLD_BB_LOWER", "BB_BREAKOUT_UP_VOLUME", "BB_BREAKOUT_DOWN_VOLUME", "EMA_STOCH_CROSS", "VWAP_DEVIATION_RSI"]),
  entryParams:      z.record(z.string(), z.unknown()).default({}),
  exitTargetType:   z.enum(["PERCENT_GAIN", "BOLLINGER_MIDDLE", "VWAP_TOUCH"]),
  exitTargetValue:  z.number().min(0),
  stopLossType:     z.enum(["PERCENT", "BOLLINGER_MIDDLE"]),
  stopLossValue:    z.number().min(0),
})

export type StrategyInput = z.infer<typeof strategySchema>

// ---- Helpers ----

async function assertNameAvailable(name: string, excludeId?: string) {
  const existing = await prisma.strategy.findFirst({
    where: { name: name.trim(), deleted: false, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  })
  if (existing) throw new Error(`Ya existe una estrategia llamada "${name.trim()}"`)
}

async function assertSuffixAvailable(analysisId: string, suffix: string, excludeId?: string) {
  const existing = await prisma.strategy.findFirst({
    where: {
      analysisId, suffix: suffix as StrategySuffix, deleted: false,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  })
  if (existing) {
    throw new Error(`El análisis ya tiene una estrategia con el sufijo "${suffix}"`)
  }
}

async function getAnalysisCode(analysisId: string): Promise<string> {
  const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } })
  if (!analysis) throw new Error("Análisis no encontrado")
  if (!analysis.code) throw new Error("El análisis no tiene código asignado. Ejecuta el seed de análisis V2.")
  return analysis.code
}

// ---- CRUD ----

export async function createStrategy(input: StrategyInput) {
  const session = await requireAuth()
  const parsed = strategySchema.parse(input)
  const name = parsed.name.trim()

  await assertNameAvailable(name)
  await assertSuffixAvailable(parsed.analysisId, parsed.suffix)

  const analysisCode = await getAnalysisCode(parsed.analysisId)
  const code = generateStrategyCode(analysisCode, parsed.suffix as StrategySuffix)

  // Check code uniqueness (shouldn't conflict given suffix constraint, but be safe)
  const codeExists = await prisma.strategy.findUnique({ where: { code } })
  if (codeExists) throw new Error(`El código "${code}" ya existe`)

  const strategy = await prisma.strategy.create({
    data: {
      code,
      name,
      description: parsed.description?.trim() || null,
      analysisId: parsed.analysisId,
      suffix: parsed.suffix as StrategySuffix,
      entryRule: parsed.entryRule as StrategyEntryRule,
      entryParams: parsed.entryParams as object,
      exitTargetType: parsed.exitTargetType as ExitTargetType,
      exitTargetValue: parsed.exitTargetValue,
      stopLossType: parsed.stopLossType as StopLossType,
      stopLossValue: parsed.stopLossValue,
      createdById: session.user.id,
    },
  })

  revalidatePath("/app/playbook/strategies")
  redirect(`/app/playbook/strategies/${strategy.id}`)
}

export async function updateStrategy(id: string, input: StrategyInput) {
  await requireAuth()
  const parsed = strategySchema.parse(input)
  const name = parsed.name.trim()

  const existing = await prisma.strategy.findUnique({ where: { id, deleted: false } })
  if (!existing) throw new Error("Estrategia no encontrada")

  // Block editing if there are PENDING orders
  const pendingOrders = await prisma.order.count({ where: { strategyId: id, status: "PENDING" } })
  if (pendingOrders > 0) {
    throw new Error(`No se puede editar: hay ${pendingOrders} orden(es) pendiente(s) con esta estrategia`)
  }

  await assertNameAvailable(name, id)

  // Only check suffix if it changed
  if (parsed.analysisId !== existing.analysisId || parsed.suffix !== existing.suffix) {
    await assertSuffixAvailable(parsed.analysisId, parsed.suffix, id)
  }

  await prisma.strategy.update({
    where: { id },
    data: {
      name,
      description: parsed.description?.trim() || null,
      entryRule: parsed.entryRule as StrategyEntryRule,
      entryParams: parsed.entryParams as object,
      exitTargetType: parsed.exitTargetType as ExitTargetType,
      exitTargetValue: parsed.exitTargetValue,
      stopLossType: parsed.stopLossType as StopLossType,
      stopLossValue: parsed.stopLossValue,
    },
  })

  revalidatePath("/app/playbook/strategies")
  revalidatePath(`/app/playbook/strategies/${id}`)
  redirect(`/app/playbook/strategies/${id}`)
}

export async function deleteStrategy(id: string) {
  await requireAuth()

  const strategy = await prisma.strategy.findUnique({ where: { id, deleted: false } })
  if (!strategy) throw new Error("Estrategia no encontrada")

  const pendingOrders = await prisma.order.count({ where: { strategyId: id, status: "PENDING" } })
  if (pendingOrders > 0) throw new Error("No se puede borrar: hay órdenes pendientes con esta estrategia")

  const openOps = await prisma.operation.count({ where: { strategyId: id, closedAt: null } })
  if (openOps > 0) throw new Error("No se puede borrar: hay operaciones abiertas con esta estrategia")

  await prisma.strategy.update({ where: { id }, data: { deleted: true } })
  revalidatePath("/app/playbook/strategies")
  redirect("/app/playbook/strategies")
}

export async function cloneStrategy(sourceId: string) {
  const session = await requireAuth()

  const source = await prisma.strategy.findUniqueOrThrow({ where: { id: sourceId } })

  // Try LONG first, then SHORT, then BNC, UP, DN — pick first available suffix for same analysis
  const suffixes: StrategySuffix[] = ["LONG", "SHORT", "BNC", "UP", "DN"]
  let newSuffix: StrategySuffix | null = null

  for (const s of suffixes) {
    const taken = await prisma.strategy.findFirst({
      where: { analysisId: source.analysisId, suffix: s, deleted: false },
    })
    if (!taken) { newSuffix = s; break }
  }

  if (!newSuffix) throw new Error("El análisis ya tiene estrategias para todos los sufijos disponibles")

  const analysisCode = await getAnalysisCode(source.analysisId)
  const code = generateStrategyCode(analysisCode, newSuffix)

  // Build unique name
  let cloneName = `${source.name} (copia)`
  let suffix2 = 2
  while (true) {
    const taken = await prisma.strategy.findFirst({ where: { name: cloneName, deleted: false } })
    if (!taken) break
    cloneName = `${source.name} (copia ${suffix2++})`
  }

  const clone = await prisma.strategy.create({
    data: {
      code,
      name: cloneName,
      description: source.description,
      analysisId: source.analysisId,
      suffix: newSuffix,
      entryRule: source.entryRule,
      entryParams: source.entryParams as object,
      exitTargetType: source.exitTargetType,
      exitTargetValue: source.exitTargetValue,
      stopLossType: source.stopLossType,
      stopLossValue: source.stopLossValue,
      createdById: session.user.id,
    },
  })

  revalidatePath("/app/playbook/strategies")
  redirect(`/app/playbook/strategies/${clone.id}`)
}
