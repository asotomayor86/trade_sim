"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"

export interface DrawingData {
  id: string
  type: "horizontal"
  price: number
  color: string
  label: string
  lineStyle: number // 0=solid 1=dotted 2=dashed
}

export async function saveDrawings(
  tickerId: string,
  drawings: DrawingData[],
  analysisId?: string
) {
  const session = await requireAuth()
  const userId = session.user.id

  const existing = await prisma.drawing.findFirst({
    where: { userId, tickerId, analysisId: analysisId ?? null },
  })

  if (existing) {
    await prisma.drawing.update({
      where: { id: existing.id },
      data: { data: drawings as object[] },
    })
  } else {
    await prisma.drawing.create({
      data: {
        userId,
        tickerId,
        analysisId: analysisId ?? null,
        data: drawings as object[],
      },
    })
  }
}

export async function loadDrawings(
  tickerId: string,
  analysisId?: string
): Promise<DrawingData[]> {
  const session = await requireAuth()
  const userId = session.user.id

  const drawing = await prisma.drawing.findFirst({
    where: { userId, tickerId, analysisId: analysisId ?? null },
  })

  if (!drawing) return []
  return drawing.data as unknown as DrawingData[]
}
