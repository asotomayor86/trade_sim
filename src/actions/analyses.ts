"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { IndicatorTipo } from "@/lib/indicators/engine"

// ---- Public types ----

export interface IndicatorInput {
  localId?: string
  type: IndicatorTipo
  params: Record<string, unknown>
  color?: string
  lineWidth?: number
  lineStyle?: number
  pane: number
}

export interface RuleInput {
  type: "ENTRY" | "EXIT_TP" | "EXIT_SL"
  direction?: "LONG" | "SHORT" | null
  description: string
  condition: Record<string, unknown>
}

export interface AnalysisInput {
  name: string
  descripcion?: string
  bias?: string
  indicators: IndicatorInput[]
  rules?: RuleInput[]
}

const MAX_ANALYSES = 15

// ---- Helpers ----

async function assertNameAvailable(name: string, excludeId?: string): Promise<void> {
  const existing = await prisma.analysis.findFirst({
    where: { name: name.trim(), deleted: false, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  })
  if (existing) throw new Error(`Ya existe un análisis llamado "${name.trim()}"`)
}

async function assertUnderLimit(excludeId?: string): Promise<void> {
  const count = await prisma.analysis.count({ where: { deleted: false } })
  const wouldExceed = excludeId ? false : count >= MAX_ANALYSES
  if (wouldExceed) {
    throw new Error(`Límite de ${MAX_ANALYSES} análisis alcanzado. Borra o duplica uno existente.`)
  }
}

// ---- CRUD ----

export async function createAnalysis(input: AnalysisInput) {
  const session = await requireAuth()
  const name = input.name.trim()
  if (!name) throw new Error("El nombre es obligatorio")

  await assertUnderLimit()
  await assertNameAvailable(name)

  const analysis = await prisma.analysis.create({
    data: {
      userId: session.user.id,
      name,
      descripcion: input.descripcion?.trim() || null,
      nameCustom: true,
      bias: input.bias ?? "NEUTRAL",
      indicators: {
        create: input.indicators.map((i) => ({
          localId: i.localId ?? crypto.randomUUID(),
          type: i.type,
          params: i.params as object,
          color: i.color ?? null,
          lineWidth: i.lineWidth ?? 1,
          lineStyle: i.lineStyle ?? 0,
          pane: i.pane,
        })),
      },
      rules: {
        create: (input.rules ?? []).map((r) => ({
          type: r.type,
          direction: r.direction ?? null,
          description: r.description,
          condition: r.condition as object,
        })),
      },
    },
  })

  revalidatePath("/app/analyses")
  redirect(`/app/analyses/${analysis.id}`)
}

export async function updateAnalysis(id: string, input: AnalysisInput) {
  await requireAuth()
  const name = input.name.trim()
  if (!name) throw new Error("El nombre es obligatorio")

  const existing = await prisma.analysis.findUnique({ where: { id, deleted: false } })
  if (!existing) throw new Error("Análisis no encontrado")

  await assertNameAvailable(name, id)

  await prisma.$transaction([
    prisma.analysisIndicator.deleteMany({ where: { analysisId: id } }),
    prisma.analysisRule.deleteMany({ where: { analysisId: id } }),
    prisma.analysis.update({
      where: { id },
      data: {
        name,
        descripcion: input.descripcion?.trim() || null,
        bias: input.bias ?? existing.bias,
        indicators: {
          create: input.indicators.map((i) => ({
            localId: i.localId ?? crypto.randomUUID(),
            type: i.type,
            params: i.params as object,
            color: i.color ?? null,
            lineWidth: i.lineWidth ?? 1,
            lineStyle: i.lineStyle ?? 0,
            pane: i.pane,
          })),
        },
        rules: {
          create: (input.rules ?? []).map((r) => ({
            type: r.type,
            direction: r.direction ?? null,
            description: r.description,
            condition: r.condition as object,
          })),
        },
      },
    }),
  ])

  revalidatePath("/app/analyses")
  revalidatePath(`/app/analyses/${id}`)
  redirect(`/app/analyses/${id}`)
}

export async function deleteAnalysis(id: string) {
  await requireAuth()

  const analysis = await prisma.analysis.findUnique({ where: { id, deleted: false } })
  if (!analysis) throw new Error("Análisis no encontrado")

  // Soft delete — UltimoAnalisisAplicado cleanup happens lazily when charts are opened
  await prisma.analysis.update({ where: { id }, data: { deleted: true } })

  revalidatePath("/app/analyses")
  redirect("/app/analyses")
}

export async function cloneAnalysis(sourceId: string) {
  const session = await requireAuth()

  const source = await prisma.analysis.findUniqueOrThrow({
    where: { id: sourceId },
    include: { indicators: true, rules: true },
  })

  await assertUnderLimit()

  // Find a unique name for the clone
  let cloneName = `${source.name} (copia)`
  let suffix = 2
  while (true) {
    const exists = await prisma.analysis.findFirst({ where: { name: cloneName, deleted: false } })
    if (!exists) break
    cloneName = `${source.name} (copia ${suffix++})`
  }

  const clone = await prisma.analysis.create({
    data: {
      userId: session.user.id,
      name: cloneName,
      descripcion: source.descripcion,
      nameCustom: true,
      bias: source.bias,
      isStandard: false,
      indicators: {
        create: source.indicators.map((i) => ({
          localId: crypto.randomUUID(),
          type: i.type,
          params: i.params as object,
          color: i.color,
          lineWidth: i.lineWidth,
          lineStyle: i.lineStyle,
          pane: i.pane,
        })),
      },
      rules: {
        create: source.rules.map((r) => ({
          type: r.type,
          direction: r.direction,
          description: r.description ?? "",
          condition: r.condition as object,
        })),
      },
    },
  })

  revalidatePath("/app/analyses")
  redirect(`/app/analyses/${clone.id}`)
}
