"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import type { AlertCondition } from "@/lib/alerts/evaluator"

export interface CreateAlertInput {
  tickerId: string
  condition: AlertCondition
  message?: string
}

export async function createAlert(input: CreateAlertInput) {
  const session = await requireAuth()

  await prisma.alert.create({
    data: {
      userId: session.user.id,
      tickerId: input.tickerId,
      condition: input.condition as object,
      message: input.message ?? null,
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
