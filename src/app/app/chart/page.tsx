import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export default async function ChartIndexPage() {
  await requireAuth()
  const first = await prisma.ticker.findFirst({ where: { active: true }, orderBy: { symbol: "asc" } })
  redirect(`/app/chart/${first?.symbol ?? "AAPL"}`)
}
