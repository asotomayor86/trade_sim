import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { marketData } from "@/lib/market-data"
import { computeSpread } from "@/lib/market-data/spread"

function authorized(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    return await runRefresh()
  } catch (e) {
    console.error("[cron/refresh-prices] fatal:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function runRefresh() {
  const tickers = await prisma.ticker.findMany({
    where: { active: true },
    select: { id: true, symbol: true, sector: true, spreadOverridePct: true },
  })

  if (tickers.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  const symbols = tickers.map((t) => t.symbol)
  const quotes = await marketData.getQuotes(symbols)

  const now = new Date()
  let updated = 0

  await Promise.all(
    tickers.map(async (ticker) => {
      const q = quotes.get(ticker.symbol)
      if (!q) return

      const spread = computeSpread(
        q.bid,
        q.ask,
        q.last,
        ticker.sector,
        ticker.spreadOverridePct
      )

      await prisma.quote.upsert({
        where: { tickerId_timestamp: { tickerId: ticker.id, timestamp: now } },
        create: {
          tickerId: ticker.id,
          bid: spread.bid,
          ask: spread.ask,
          last: q.last,
          volume: q.volume ? BigInt(Math.round(q.volume)) : null,
          timestamp: now,
          source: q.source,
        },
        update: {
          bid: spread.bid,
          ask: spread.ask,
          last: q.last,
          source: q.source,
        },
      })
      updated++
    })
  )

  return NextResponse.json({ updated, symbols: symbols.length })
}
