import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { marketData } from "@/lib/market-data"
import type { Timeframe } from "@/lib/market-data"

const CACHE_MINUTES = 15

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const symbol = searchParams.get("symbol")?.toUpperCase()
  const tf = (searchParams.get("tf") ?? "1D") as Timeframe
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : daysAgo(365)
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date()

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 })
  if (!["1D", "1H"].includes(tf)) return NextResponse.json({ error: "tf must be 1D or 1H" }, { status: 400 })

  const ticker = await prisma.ticker.findUnique({ where: { symbol, active: true } })
  if (!ticker) return NextResponse.json({ error: "Ticker not found" }, { status: 404 })

  // Read from cache first
  const dbTimeframe = tf === "1D" ? "ONE_DAY" : "ONE_HOUR"
  const staleAfter = new Date(Date.now() - CACHE_MINUTES * 60 * 1000)

  const cached = await prisma.candle.findMany({
    where: {
      tickerId: ticker.id,
      timeframe: dbTimeframe,
      timestamp: { gte: from, lte: to },
    },
    orderBy: { timestamp: "asc" },
  })

  // Check if cache is fresh enough (most recent candle within CACHE_MINUTES)
  const mostRecent = cached.at(-1)
  if (mostRecent && mostRecent.timestamp >= staleAfter) {
    return NextResponse.json(formatCandles(cached))
  }

  // Fetch from provider and persist
  const fresh = await marketData.getCandles(symbol, tf, from, to)

  if (fresh.length > 0) {
    await prisma.candle.createMany({
      data: fresh.map((c) => ({
        tickerId: ticker.id,
        timeframe: dbTimeframe,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: BigInt(Math.round(c.volume)),
        timestamp: c.timestamp,
        source: c.source,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json(fresh.length > 0 ? formatCandles(fresh) : formatCandles(cached))
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000)
}

function formatCandles(candles: { open: number; high: number; low: number; close: number; volume: bigint | number; timestamp: Date | string }[]) {
  return candles.map((c) => ({
    time: new Date(c.timestamp).toISOString(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: Number(c.volume),
  }))
}
