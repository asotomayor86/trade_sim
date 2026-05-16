import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { ChartPage } from "@/components/chart/ChartPage"

interface Props {
  params: Promise<{ symbol: string }>
}

export default async function SymbolChartPage({ params }: Props) {
  await requireAuth()
  const { symbol } = await params
  const sym = symbol.toUpperCase()

  const ticker = await prisma.ticker.findUnique({
    where: { symbol: sym, active: true },
    select: { id: true, symbol: true, name: true, sector: true },
  })

  if (!ticker) redirect("/app/chart/AAPL")

  const tickers = await prisma.ticker.findMany({
    where: { active: true },
    orderBy: { symbol: "asc" },
    select: { id: true, symbol: true, name: true, sector: true },
  })

  return <ChartPage ticker={ticker} tickers={tickers} />
}
