"use server"

import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import type { AlertCondition } from "@/lib/alerts/evaluator"

const alertSchema = z.object({
  tickerId:  z.string().cuid(),
  condition: z.object({
    indicator: z.literal("PRICE"),
    op:        z.enum([">=", "<=", ">", "<"]),
    value:     z.number().positive(),
  }),
  message: z.string().max(200).optional(),
})

export interface CreateAlertInput {
  tickerId: string
  condition: AlertCondition
  message?: string
}

export async function createAlert(input: CreateAlertInput) {
  const parsed = alertSchema.safeParse(input)
  if (!parsed.success) throw new Error("Datos de alerta inválidos")

  const session = await requireAuth()
  const data = parsed.data

  await prisma.alert.create({
    data: {
      userId: session.user.id,
      tickerId: data.tickerId,
      condition: data.condition as object,
      message: data.message ?? null,
      active: true,
    },
  })

  revalidatePath("/app/alerts")
}

export async function dismissAlert(alertId: string) {
  const session = await requireAuth()
  const userId = session.user.id

  const alert = await prisma.alert.findUniqueOrThrow({ where: { id: alertId } })
  if (alert.userId !== userId) throw new Error("No autorizado")

  await prisma.alert.update({ where: { id: alertId }, data: { active: false } })
  revalidatePath("/app/alerts")
}

export async function markAllNotificationsRead() {
  const session = await requireAuth()
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })
}
