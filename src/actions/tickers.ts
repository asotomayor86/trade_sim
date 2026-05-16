"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const tickerSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1).max(100),
  sector: z.string().min(1),
})

export async function addTicker(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  await requireAdmin()

  const parsed = tickerSchema.safeParse({
    symbol: formData.get("symbol"),
    name: formData.get("name"),
    sector: formData.get("sector"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const { symbol, name, sector } = parsed.data

  const existing = await prisma.ticker.findUnique({ where: { symbol } })
  if (existing) {
    if (!existing.active) {
      await prisma.ticker.update({ where: { symbol }, data: { active: true, name, sector } })
      revalidatePath("/admin/tickers")
      return null
    }
    return { error: `${symbol} ya existe` }
  }

  await prisma.ticker.create({ data: { symbol, name, sector } })
  revalidatePath("/admin/tickers")
  return null
}

export async function removeTicker(symbol: string) {
  await requireAdmin()
  await prisma.ticker.update({ where: { symbol }, data: { active: false } })
  revalidatePath("/admin/tickers")
}

export async function setSpreadOverride(symbol: string, pct: number | null) {
  await requireAdmin()
  await prisma.ticker.update({ where: { symbol }, data: { spreadOverridePct: pct } })
  revalidatePath("/admin/tickers")
}

export async function bulkUpsertTickers(
  tickers: { symbol: string; name: string; sector: string }[]
) {
  await requireAdmin()

  await Promise.all(
    tickers.map((t) =>
      prisma.ticker.upsert({
        where: { symbol: t.symbol },
        create: { symbol: t.symbol, name: t.name, sector: t.sector },
        update: { name: t.name, sector: t.sector, active: true },
      })
    )
  )

  revalidatePath("/admin/tickers")
}
