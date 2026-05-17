import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { ChartPage } from "@/components/chart/ChartPage"
import { getLastApplied } from "@/actions/ultimo-analisis"
import { buildSuggestions } from "@/lib/playbook/entry-suggester"
import type { IndicatorConfig } from "@/lib/indicators/engine"
import type { SuggestionRow } from "@/lib/playbook/entry-suggester"

export type { SuggestionRow }

interface Props {
  params: Promise<{ symbol: string }>
}

export interface AnalysisSummary {
  id: string
  name: string
  descripcion: string | null
  indicators: IndicatorConfig[]
}

export interface StrategySummary {
  id: string
  code: string
  name: string
  analysisId: string
  suffix: string
  exitTargetType: string
  exitTargetValue: number
  stopLossType: string
  stopLossValue: number
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

  const [tickers, allAnalyses, lastApplied, allStrategies, recentCandles] = await Promise.all([
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
    prisma.strategy.findMany({
      where: { deleted: false },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, analysisId: true, suffix: true, entryRule: true, entryParams: true, exitTargetType: true, exitTargetValue: true, stopLossType: true, stopLossValue: true },
    }),
    prisma.candle.findMany({
      where: { tickerId: ticker.id, timeframe: "ONE_DAY" },
      orderBy: { timestamp: "asc" },
      take: 100,
      select: { open: true, high: true, low: true, close: true, volume: true, timestamp: true },
    }),
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

  // Compute entry suggestions server-side using cached candles
  const candlePoints = recentCandles.map((c) => ({
    time: Math.floor(c.timestamp.getTime() / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: Number(c.volume),
  }))

  const strategiesWithParams = allStrategies.map((s) => ({
    ...s,
    entryParams: (s.entryParams ?? {}) as Record<string, unknown>,
  }))

  const suggestions = buildSuggestions(strategiesWithParams, candlePoints)

  return (
    <ChartPage
      ticker={ticker}
      tickers={tickers}
      analyses={analyses}
      initialLastApplied={lastApplied}
      userId={session.user.id}
      strategies={allStrategies}
      suggestions={suggestions}
    />
  )
}
