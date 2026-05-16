export type Direction = "LONG" | "SHORT"

export interface SpreadQuote {
  bid: number
  ask: number
}

/** Calculate entry price and quantity for opening an operation. */
export function calcEntry(direction: Direction, quote: SpreadQuote, nominal = 100) {
  const entryPrice = direction === "LONG" ? quote.ask : quote.bid
  const quantity = nominal / entryPrice
  const spreadApplied = quote.ask - quote.bid

  return { entryPrice, quantity, spreadApplied }
}

/** Calculate exit price and PnL for closing an operation. */
export function calcExit(
  direction: Direction,
  entryPrice: number,
  quantity: number,
  nominal: number,
  exitQuote: SpreadQuote
) {
  // LONG: buy at ask, sell at bid → PnL = (bid_exit - ask_entry) * qty
  // SHORT: sell at bid, buy back at ask → PnL = (bid_entry - ask_exit) * qty
  const exitPrice = direction === "LONG" ? exitQuote.bid : exitQuote.ask

  const pnl =
    direction === "LONG"
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity

  const pnlPct = (pnl / nominal) * 100

  return { exitPrice, pnl, pnlPct }
}

/** Unrealized PnL for an open position using current quote. */
export function calcUnrealizedPnL(
  direction: Direction,
  entryPrice: number,
  quantity: number,
  nominal: number,
  currentQuote: SpreadQuote
) {
  return calcExit(direction, entryPrice, quantity, nominal, currentQuote)
}

/**
 * Check if TP or SL has been hit given the current quote.
 * Returns 'TP', 'SL', or null.
 */
export function checkTpSl(
  direction: Direction,
  currentQuote: SpreadQuote,
  tpPrice: number | null,
  slPrice: number | null
): "TP" | "SL" | null {
  const exitPrice = direction === "LONG" ? currentQuote.bid : currentQuote.ask

  if (direction === "LONG") {
    if (tpPrice !== null && exitPrice >= tpPrice) return "TP"
    if (slPrice !== null && exitPrice <= slPrice) return "SL"
  } else {
    if (tpPrice !== null && exitPrice <= tpPrice) return "TP"
    if (slPrice !== null && exitPrice >= slPrice) return "SL"
  }

  return null
}
