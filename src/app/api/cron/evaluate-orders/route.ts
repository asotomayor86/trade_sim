import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { createAnalysisSnapshot } from "@/lib/analyses/snapshot"
import { computeSpread } from "@/lib/market-data/spread"
import { calcEntry, calcExit, type Direction } from "@/lib/operations/pnl"
import { evaluateOrder, evaluateOperation, computeExitPrices } from "@/lib/orders/evaluator"
import { calcBollinger, calcVWAP } from "@/lib/indicators/calculations"
import type { MinimalCandle } from "@/lib/orders/evaluator"

const NOMINAL_ORDER = 1000

function authorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

// ---- Fetch latest 1-min candle from Alpaca ----

const BASE = (process.env.ALPACA_BASE_URL ?? "https://data.alpaca.markets").replace(/^﻿/, "").trim()
const KEY = (process.env.ALPACA_API_KEY ?? "").replace(/^﻿/, "").trim()
const SECRET = (process.env.ALPACA_API_SECRET ?? "").replace(/^﻿/, "").trim()

async function fetchLatest1MinCandle(symbol: string): Promise<MinimalCandle | null> {
  try {
    const end = new Date()
    const start = new Date(end.getTime() - 5 * 60 * 1000) // last 5 min

    const params = new URLSearchParams({
      symbols: symbol,
      timeframe: "1Min",
      start: start.toISOString(),
      end: end.toISOString(),
      feed: "iex",
      limit: "5",
    })

    const res = await fetch(`${BASE}/v2/stocks/bars?${params}`, {
      headers: {
        "APCA-API-KEY-ID": KEY,
        "APCA-API-SECRET-KEY": SECRET,
        Accept: "application/json",
      },
    })

    if (!res.ok) return null

    const data = await res.json() as { bars?: Record<string, { h: number; l: number; o: number; c: number }[]> }
    const bars = data.bars?.[symbol]
    if (!bars || bars.length === 0) return null

    // Take the most recent completed bar
    const bar = bars[bars.length - 1]
    return { high: bar.h, low: bar.l, open: bar.o, close: bar.c }
  } catch {
    return null
  }
}

// ---- Get latest quote for closing price ----

async function getQuoteForTicker(tickerId: string, sector: string, spreadOverridePct: number | null) {
  const q = await prisma.quote.findFirst({ where: { tickerId }, orderBy: { timestamp: "desc" } })
  if (!q) return null
  return computeSpread(q.bid, q.ask, q.last, sector, spreadOverridePct)
}

// ---- Compute ref price for BB/VWAP exit types ----

async function computeRefPrice(
  exitType: string,
  symbol: string,
  tickerId: string
): Promise<number | undefined> {
  try {
    if (exitType === "BOLLINGER_MIDDLE") {
      const candles = await prisma.candle.findMany({
        where: { tickerId, timeframe: "ONE_DAY" },
        orderBy: { timestamp: "desc" },
        take: 25,
        select: { open: true, high: true, low: true, close: true, volume: true, timestamp: true },
      })
      if (candles.length < 20) return undefined
      const pts = candles.reverse().map((c) => ({
        time: Math.floor(c.timestamp.getTime() / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close, volume: Number(c.volume),
      }))
      const bb = calcBollinger(pts, 20, 2)
      return bb[bb.length - 1]?.middle
    }
    if (exitType === "VWAP_TOUCH") {
      const candles = await prisma.candle.findMany({
        where: { tickerId, timeframe: "ONE_DAY" },
        orderBy: { timestamp: "desc" },
        take: 30,
        select: { open: true, high: true, low: true, close: true, volume: true, timestamp: true },
      })
      if (candles.length === 0) return undefined
      const pts = candles.reverse().map((c) => ({
        time: Math.floor(c.timestamp.getTime() / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close, volume: Number(c.volume),
      }))
      const vwap = calcVWAP(pts, "diario")
      return vwap[vwap.length - 1]?.value
    }
  } catch {
    // ignore
  }
  void symbol
  return undefined
}

// ---- Main handler ----

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    return await runEvaluation()
  } catch (e) {
    console.error("[cron/evaluate-orders] fatal:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function runEvaluation() {
  const now = new Date()
  let ordersExecuted = 0
  let ordersExpired = 0
  let operationsClosed = 0

  // ---- 1. Load PENDING orders ----
  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    include: {
      ticker: { select: { id: true, symbol: true, sector: true, spreadOverridePct: true } },
      strategy: {
        select: {
          id: true, analysisId: true,
          exitTargetType: true, exitTargetValue: true,
          stopLossType: true, stopLossValue: true,
        },
      },
    },
  })

  // ---- 2. Load OPEN strategy operations ----
  const openStrategyOps = await prisma.operation.findMany({
    where: { closedAt: null, orderId: { not: null } },
    select: {
      id: true, direction: true, tpPrice: true, slPrice: true,
      entryPrice: true, quantity: true, nominal: true,
      ticker: { select: { id: true, symbol: true, sector: true, spreadOverridePct: true } },
    },
  })

  // ---- 3. Group by symbol to minimize Alpaca calls ----
  const symbolsSet = new Set<string>()
  pendingOrders.forEach((o) => symbolsSet.add(o.ticker.symbol))
  openStrategyOps.forEach((o) => symbolsSet.add(o.ticker.symbol))

  const candleMap = new Map<string, MinimalCandle | null>()
  for (const symbol of symbolsSet) {
    const c = await fetchLatest1MinCandle(symbol)
    candleMap.set(symbol, c)
  }

  // ---- 4. Evaluate PENDING orders ----
  for (const order of pendingOrders) {
    const candle = candleMap.get(order.ticker.symbol) ?? null
    const verdict = evaluateOrder({ targetPrice: order.targetPrice, expiresAt: order.expiresAt }, candle, now)

    if (verdict === "EXPIRE") {
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } }),
        prisma.unexecutedOrder.create({
          data: {
            orderId: order.id,
            userId: order.userId,
            tickerId: order.tickerId,
            strategyId: order.strategyId,
            analysisId: order.analysisId,
            targetPrice: order.targetPrice,
            direction: order.direction,
            reason: "EXPIRED",
            createdAt: order.createdAt,
          },
        }),
      ])
      ordersExpired++
      continue
    }

    if (verdict === "EXECUTE") {
      try {
        // Get entry price from the quote
        const spread = await getQuoteForTicker(order.tickerId, order.ticker.sector, order.ticker.spreadOverridePct)
        if (!spread) continue

        const { entryPrice, quantity, spreadApplied } = calcEntry(order.direction as Direction, spread, NOMINAL_ORDER)

        // Compute ref price for BB/VWAP exits
        const refPrice = await computeRefPrice(order.strategy.exitTargetType, order.ticker.symbol, order.tickerId)

        const { tpPrice, slPrice } = computeExitPrices(
          {
            exitTargetType: order.strategy.exitTargetType,
            exitTargetValue: order.strategy.exitTargetValue,
            stopLossType: order.strategy.stopLossType,
            stopLossValue: order.strategy.stopLossValue,
          },
          entryPrice,
          order.direction as Direction,
          refPrice
        )

        const snapshotId = await createAnalysisSnapshot(order.strategy.analysisId)

        await prisma.$transaction([
          prisma.order.update({ where: { id: order.id }, data: { status: "EXECUTED", executedAt: now } }),
          prisma.operation.create({
            data: {
              userId: order.userId,
              tickerId: order.tickerId,
              analysisId: order.strategy.analysisId,
              snapshotId,
              direction: order.direction,
              entryPrice,
              quantity,
              nominal: NOMINAL_ORDER,
              spreadApplied,
              spreadSource: spread.source,
              tpPrice,
              slPrice,
              targetPriceExit: tpPrice,
              orderId: order.id,
              strategyId: order.strategyId,
            },
          }),
        ])
        ordersExecuted++
      } catch (e) {
        console.error(`[evaluate-orders] failed to execute order ${order.id}:`, e)
      }
    }
  }

  // ---- 5. Evaluate open strategy operations for TP/SL ----
  for (const op of openStrategyOps) {
    const candle = candleMap.get(op.ticker.symbol)
    if (!candle) continue

    const verdict = evaluateOperation(
      { tpPrice: op.tpPrice, slPrice: op.slPrice, direction: op.direction as Direction },
      candle
    )

    if (verdict === "HOLD") continue

    try {
      const spread = await getQuoteForTicker(op.ticker.id, op.ticker.sector, op.ticker.spreadOverridePct)
      if (!spread) continue

      const { exitPrice, pnl, pnlPct } = calcExit(op.direction as Direction, op.entryPrice, op.quantity, op.nominal, spread)

      await prisma.operation.update({
        where: { id: op.id },
        data: {
          exitPrice,
          pnl,
          pnlPct,
          closeReason: verdict === "CLOSE_TP" ? "TP" : "SL",
          closedAt: now,
          closedByStrategy: true,
        },
      })
      operationsClosed++
    } catch (e) {
      console.error(`[evaluate-orders] failed to close operation ${op.id}:`, e)
    }
  }

  return NextResponse.json({ ordersExecuted, ordersExpired, operationsClosed, at: now.toISOString() })
}
