import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { computeSpread } from "@/lib/market-data/spread"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase()
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 })

  const ticker = await prisma.ticker.findUnique({ where: { symbol, active: true } })
  if (!ticker) return NextResponse.json({ error: "Ticker not found" }, { status: 404 })

  // Get latest cached quote
  const quote = await prisma.quote.findFirst({
    where: { tickerId: ticker.id },
    orderBy: { timestamp: "desc" },
  })

  if (!quote) return NextResponse.json({ error: "No quote available yet" }, { status: 404 })

  const spread = computeSpread(
    quote.bid,
    quote.ask,
    quote.last,
    ticker.sector,
    ticker.spreadOverridePct
  )

  return NextResponse.json({
    symbol,
    bid: spread.bid,
    ask: spread.ask,
    mid: spread.mid,
    last: quote.last,
    spreadPct: spread.spreadPct,
    spreadSource: spread.source,
    timestamp: quote.timestamp,
    source: quote.source,
  })
}
