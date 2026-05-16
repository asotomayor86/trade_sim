"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { generateAnalysisName, type Bias, type IndicatorCfg } from "@/lib/analyses/naming"
import { z } from "zod"

// ---- Types shared with forms ----

export interface IndicatorInput {
  type: string
  params: Record<string, number>
  color?: string
  pane: number
}

export interface RuleInput {
  type: "ENTRY" | "EXIT_TP" | "EXIT_SL"
  direction?: "LONG" | "SHORT" | null
  description: string
  condition: Record<string, unknown>
}

export interface AnalysisInput {
  name?: string
  nameCustom: boolean
  bias: Bias
  indicators: IndicatorInput[]
  rules: RuleInput[]
}

const biasEnum = z.enum(["BULLISH", "BEARISH", "NEUTRAL"])

// ---- Helpers ----

async function assertOwner(analysisId: string, userId: string) {
  const a = await prisma.analysis.findUnique({ where: { id: analysisId } })
  if (!a || a.isStandard) throw new Error("No puedes editar este análisis")
  if (a.userId !== userId) throw new Error("No autorizado")
  return a
}

function buildName(input: AnalysisInput): string {
  if (input.nameCustom && input.name?.trim()) return input.name.trim()
  const trigger =
    input.rules.find((r) => r.type === "ENTRY")?.description ?? ""
  return generateAnalysisName(
    input.bias,
    input.indicators as IndicatorCfg[],
    trigger
  )
}

// ---- CRUD ----

export async function createAnalysis(input: AnalysisInput) {
  const session = await requireAuth()
  const userId = session.user.id

  const name = buildName(input)

  const analysis = await prisma.analysis.create({
    data: {
      userId,
      name,
      nameCustom: input.nameCustom,
      bias: input.bias,
      indicators: {
        create: input.indicators.map((i) => ({
          type: i.type,
          params: i.params,
          color: i.color ?? null,
          pane: i.pane,
        })),
      },
      rules: {
        create: input.rules.map((r) => ({
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
  const session = await requireAuth()
  await assertOwner(id, session.user.id)

  const name = buildName(input)

  // Check if there are open operations with this analysis
  const openOps = await prisma.operation.count({
    where: { analysisId: id, closedAt: null },
  })

  if (openOps > 0) {
    // Don't change the analysis itself; create a new version and redirect to it
    await createAnalysis({ ...input, name, nameCustom: input.nameCustom })
    return
  }

  // Safe to update in place
  await prisma.$transaction([
    prisma.analysisIndicator.deleteMany({ where: { analysisId: id } }),
    prisma.analysisRule.deleteMany({ where: { analysisId: id } }),
    prisma.analysis.update({
      where: { id },
      data: {
        name,
        nameCustom: input.nameCustom,
        bias: input.bias,
        indicators: {
          create: input.indicators.map((i) => ({
            type: i.type,
            params: i.params,
            color: i.color ?? null,
            pane: i.pane,
          })),
        },
        rules: {
          create: input.rules.map((r) => ({
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
}

export async function deleteAnalysis(id: string) {
  const session = await requireAuth()
  await assertOwner(id, session.user.id)

  const hasOps = await prisma.operation.count({ where: { analysisId: id } })
  if (hasOps > 0) throw new Error("No puedes borrar un análisis con operaciones")

  await prisma.analysis.update({ where: { id }, data: { deleted: true } })
  revalidatePath("/app/analyses")
  redirect("/app/analyses")
}

export async function cloneAnalysis(sourceId: string) {
  const session = await requireAuth()
  const userId = session.user.id

  const source = await prisma.analysis.findUniqueOrThrow({
    where: { id: sourceId },
    include: { indicators: true, rules: true },
  })

  const clone = await prisma.analysis.create({
    data: {
      userId,
      name: `${source.name} (copia)`,
      nameCustom: true,
      bias: source.bias,
      isStandard: false,
      indicators: {
        create: source.indicators.map((i) => ({
          type: i.type,
          params: i.params as Record<string, number>,
          color: i.color,
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
