import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { marketData } from "@/lib/market-data"
import { computeSpread } from "@/lib/market-data/spread"
import { checkTpSl, type Direction } from "@/lib/operations/pnl"
import { closeOperation } from "@/actions/operations"
import { evalAlertCondition, type AlertCondition } from "@/lib/alerts/evaluator"
import { sendPushToUser } from "@/lib/push/sender"

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

  // ── Evaluate TP/SL for open operations ──────────────────────────────────
  const openOps = await prisma.operation.findMany({
    where: {
      closedAt: null,
      OR: [{ tpPrice: { not: null } }, { slPrice: { not: null } }],
    },
    select: {
      id: true, direction: true, tpPrice: true, slPrice: true,
      ticker: { select: { id: true, sector: true, spreadOverridePct: true } },
    },
  })

  let triggered = 0
  for (const op of openOps) {
    const latestQuote = await prisma.quote.findFirst({
      where: { tickerId: op.ticker.id },
      orderBy: { timestamp: "desc" },
    })
    if (!latestQuote) continue

    const spread = computeSpread(latestQuote.bid, latestQuote.ask, latestQuote.last, op.ticker.sector, op.ticker.spreadOverridePct)
    const hit = checkTpSl(op.direction as Direction, spread, op.tpPrice, op.slPrice)

    if (hit) {
      try {
        await closeOperation(op.id, hit)
        triggered++
      } catch { /* already closed or other error */ }
    }
  }

  // ── Evaluate price alerts ────────────────────────────────────────────────
  const activeAlerts = await prisma.alert.findMany({
    where: { active: true, tickerId: { not: null } },
    select: {
      id: true, userId: true, condition: true, message: true,
      ticker: { select: { id: true, symbol: true } },
    },
  })

  // Build a map: tickerId → latest last price
  const priceMap = new Map<string, number>()
  for (const ticker of tickers) {
    const q = quotes.get(ticker.symbol)
    if (q) priceMap.set(ticker.id, q.last)
  }

  let alertsTriggered = 0
  for (const alert of activeAlerts) {
    if (!alert.ticker) continue
    const last = priceMap.get(alert.ticker.id)
    if (last === undefined) continue

    const cond = alert.condition as unknown as AlertCondition
    if (!evalAlertCondition(cond, last)) continue

    try {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { active: false, triggeredAt: now },
      })

      const symbol = alert.ticker.symbol
      const title = `Alerta ${symbol}`
      const body = alert.message ?? `${symbol} precio ${cond.op} $${cond.value} alcanzado ($${last.toFixed(2)})`

      await prisma.notification.create({
        data: { userId: alert.userId, type: "ALERT", title, body },
      })

      await sendPushToUser(alert.userId, title, body)
      alertsTriggered++
    } catch { /* continue with next alert */ }
  }

  return NextResponse.json({ updated, symbols: symbols.length, tpSlTriggered: triggered, alertsTriggered })
}
