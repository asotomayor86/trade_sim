import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { ChartPage } from "@/components/chart/ChartPage"
import { getLastApplied } from "@/actions/ultimo-analisis"
import type { IndicatorConfig } from "@/lib/indicators/engine"

interface Props {
  params: Promise<{ symbol: string }>
}

export interface AnalysisSummary {
  id: string
  name: string
  descripcion: string | null
  indicators: IndicatorConfig[]
}

export default async function SymbolChartPage({ params }: Props) {
  const session = await requireAuth()
  const { symbol } = await params
  const sym = symbol.toUpperCase()

  const ticker = await prisma.ticker.findUnique({
    where: { symbol: sym, active: true },
    select: { id: true, symbol: true, name: true, sector: true },
  })

  if (!ticker) redirect("/app/chart/AAPL")

  const [tickers, allAnalyses, lastApplied] = await Promise.all([
    prisma.ticker.findMany({
      where: { active: true },
      orderBy: { symbol: "asc" },
      select: { id: true, symbol: true, name: true, sector: true },
    }),
    prisma.analysis.findMany({
      where: { deleted: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        descripcion: true,
        indicators: {
          orderBy: { pane: "asc" },
          select: { localId: true, type: true, params: true, color: true, lineWidth: true, lineStyle: true, pane: true },
        },
      },
    }),
    getLastApplied(ticker.id),
  ])

  const analyses: AnalysisSummary[] = allAnalyses.map((a) => ({
    id: a.id,
    name: a.name,
    descripcion: a.descripcion,
    indicators: a.indicators.map((ind) => ({
      localId: ind.localId,
      tipo: ind.type as IndicatorConfig["tipo"],
      params: (ind.params ?? {}) as Record<string, unknown>,
      panel: ind.pane === 0 ? "overlay" : "sub",
      visual: {
        color: ind.color ?? "#f59e0b",
        lineWidth: ind.lineWidth,
        lineStyle: ind.lineStyle,
      },
    })),
  }))

  return (
    <ChartPage
      ticker={ticker}
      tickers={tickers}
      analyses={analyses}
      initialLastApplied={lastApplied}
      userId={session.user.id}
    />
  )
}
