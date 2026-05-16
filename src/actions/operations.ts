"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAuth } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { createAnalysisSnapshot } from "@/lib/analyses/snapshot"
import { calcEntry, calcExit, type Direction } from "@/lib/operations/pnl"
import { computeSpread } from "@/lib/market-data/spread"

const NOMINAL = 100

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getLatestQuote(tickerId: string) {
  const q = await prisma.quote.findFirst({
    where: { tickerId },
    orderBy: { timestamp: "desc" },
  })
  if (!q) throw new Error("No hay cotización disponible para este ticker")

  const ticker = await prisma.ticker.findUniqueOrThrow({
    where: { id: tickerId },
    select: { sector: true, spreadOverridePct: true },
  })

  const spread = computeSpread(q.bid, q.ask, q.last, ticker.sector, ticker.spreadOverridePct)
  return { bid: spread.bid, ask: spread.ask, last: q.last, timestamp: q.timestamp }
}

// ── Open ─────────────────────────────────────────────────────────────────────

export interface OpenOperationInput {
  tickerId: string
  analysisId: string
  direction: Direction
  tpPrice?: number | null
  slPrice?: number | null
}

export async function openOperation(input: OpenOperationInput) {
  const session = await requireAuth()
  const userId = session.user.id

  const quote = await getLatestQuote(input.tickerId)
  const { entryPrice, quantity, spreadApplied } = calcEntry(input.direction, quote, NOMINAL)

  const snapshotId = await createAnalysisSnapshot(input.analysisId)

  const operation = await prisma.operation.create({
    data: {
      userId,
      tickerId: input.tickerId,
      analysisId: input.analysisId,
      snapshotId,
      direction: input.direction,
      entryPrice,
      quantity,
      nominal: NOMINAL,
      spreadApplied,
      spreadSource: quote.bid !== null ? "alpaca" : "simulated",
      tpPrice: input.tpPrice ?? null,
      slPrice: input.slPrice ?? null,
    },
  })

  revalidatePath("/app/operations")
  return operation
}

// ── Close ────────────────────────────────────────────────────────────────────

export async function closeOperation(
  operationId: string,
  reason: "MANUAL" | "TP" | "SL" | "ALERT" = "MANUAL"
) {
  let callerId: string | null = null
  if (reason === "MANUAL") {
    const session = await requireAuth()
    callerId = session.user.id
  }

  const op = await prisma.operation.findUniqueOrThrow({
    where: { id: operationId },
    select: {
      userId: true, tickerId: true, direction: true,
      entryPrice: true, quantity: true, nominal: true,
      closedAt: true,
    },
  })

  if (callerId !== null && op.userId !== callerId) throw new Error("No autorizado")
  if (op.closedAt) throw new Error("La operación ya está cerrada")

  const quote = await getLatestQuote(op.tickerId)
  const { exitPrice, pnl, pnlPct } = calcExit(
    op.direction as Direction,
    op.entryPrice,
    op.quantity,
    op.nominal,
    quote
  )

  await prisma.operation.update({
    where: { id: operationId },
    data: {
      exitPrice,
      pnl,
      pnlPct,
      closeReason: reason,
      closedAt: new Date(),
    },
  })

  revalidatePath("/app/operations")
  revalidatePath("/app/dashboard")
  return { exitPrice, pnl, pnlPct }
}

// ── Preview (no persiste) ────────────────────────────────────────────────────

export async function previewOperation(tickerId: string, direction: Direction) {
  await requireAuth()
  const quote = await getLatestQuote(tickerId)
  const { entryPrice, quantity, spreadApplied } = calcEntry(direction, quote, NOMINAL)

  return {
    entryPrice,
    quantity,
    spreadApplied,
    spreadPct: (spreadApplied / entryPrice) * 100,
    quoteTimestamp: quote.timestamp,
  }
}
