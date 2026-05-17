"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const ORDER_VALIDITY_DAYS = 7
const ORDER_AMOUNT = 1000

const createOrderSchema = z.object({
  tickerId:   z.string().cuid(),
  strategyId: z.string().cuid(),
  targetPrice: z.number().positive(),
  direction:  z.enum(["LONG", "SHORT"]),
})

export async function createOrder(input: z.infer<typeof createOrderSchema>) {
  const session = await requireAuth()
  const parsed = createOrderSchema.parse(input)

  const strategy = await prisma.strategy.findUnique({
    where: { id: parsed.strategyId, deleted: false },
    select: { id: true, analysisId: true },
  })
  if (!strategy) throw new Error("Estrategia no encontrada")

  const ticker = await prisma.ticker.findUnique({
    where: { id: parsed.tickerId, active: true },
    select: { id: true },
  })
  if (!ticker) throw new Error("Ticker no encontrado")

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + ORDER_VALIDITY_DAYS)

  await prisma.order.create({
    data: {
      userId:      session.user.id,
      tickerId:    parsed.tickerId,
      strategyId:  parsed.strategyId,
      analysisId:  strategy.analysisId,
      targetPrice: parsed.targetPrice,
      direction:   parsed.direction,
      amount:      ORDER_AMOUNT,
      expiresAt,
    },
  })

  revalidatePath("/app/orders")
}

export async function cancelOrder(orderId: string) {
  // Orders cannot be cancelled manually per spec — this is intentionally not exposed in the UI.
  // Only kept as a reference; not exported for client use.
  void orderId
  throw new Error("Las órdenes no se pueden cancelar manualmente")
}
