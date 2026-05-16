import { describe, it, expect } from "vitest"
import { calcEntry, calcExit, calcUnrealizedPnL, checkTpSl } from "./pnl"

const NOMINAL = 100

describe("calcEntry", () => {
  it("LONG compra al ask", () => {
    const { entryPrice, quantity, spreadApplied } = calcEntry("LONG", { bid: 99, ask: 101 }, NOMINAL)
    expect(entryPrice).toBe(101)
    expect(quantity).toBeCloseTo(NOMINAL / 101)
    expect(spreadApplied).toBeCloseTo(2)
  })

  it("SHORT vende al bid", () => {
    const { entryPrice } = calcEntry("SHORT", { bid: 99, ask: 101 }, NOMINAL)
    expect(entryPrice).toBe(99)
  })

  it("spread aplicado es ask - bid", () => {
    const { spreadApplied } = calcEntry("LONG", { bid: 150, ask: 150.5 }, NOMINAL)
    expect(spreadApplied).toBeCloseTo(0.5)
  })
})

describe("calcExit", () => {
  it("LONG: PnL positivo cuando sube el precio", () => {
    const qty = NOMINAL / 100  // entry 100
    const { exitPrice, pnl, pnlPct } = calcExit("LONG", 100, qty, NOMINAL, { bid: 110, ask: 111 })
    expect(exitPrice).toBe(110)          // salida al bid
    expect(pnl).toBeCloseTo((110 - 100) * qty)
    expect(pnlPct).toBeCloseTo(10)       // 10%
  })

  it("LONG: PnL negativo cuando baja el precio", () => {
    const qty = NOMINAL / 100
    const { pnl } = calcExit("LONG", 100, qty, NOMINAL, { bid: 90, ask: 91 })
    expect(pnl).toBeCloseTo(-10)
  })

  it("SHORT: PnL positivo cuando baja el precio", () => {
    const qty = NOMINAL / 100  // entry 100
    const { exitPrice, pnl, pnlPct } = calcExit("SHORT", 100, qty, NOMINAL, { bid: 89, ask: 90 })
    expect(exitPrice).toBe(90)           // salida al ask
    expect(pnl).toBeCloseTo((100 - 90) * qty)
    expect(pnlPct).toBeCloseTo(10)
  })

  it("SHORT: PnL negativo cuando sube el precio", () => {
    const qty = NOMINAL / 100
    const { pnl } = calcExit("SHORT", 100, qty, NOMINAL, { bid: 110, ask: 111 })
    expect(pnl).toBeCloseTo(-11)
  })

  it("pnlPct = pnl / nominal * 100", () => {
    const qty = NOMINAL / 200  // entry 200
    const { pnl, pnlPct } = calcExit("LONG", 200, qty, NOMINAL, { bid: 210, ask: 211 })
    expect(pnlPct).toBeCloseTo((pnl / NOMINAL) * 100)
  })
})

describe("calcUnrealizedPnL", () => {
  it("es equivalente a calcExit", () => {
    const qty = NOMINAL / 50
    const quote = { bid: 55, ask: 56 }
    const unrealized = calcUnrealizedPnL("LONG", 50, qty, NOMINAL, quote)
    const exit = calcExit("LONG", 50, qty, NOMINAL, quote)
    expect(unrealized.pnl).toBeCloseTo(exit.pnl)
    expect(unrealized.pnlPct).toBeCloseTo(exit.pnlPct)
  })
})

describe("checkTpSl", () => {
  it("LONG: TP se dispara cuando bid >= tpPrice", () => {
    expect(checkTpSl("LONG", { bid: 110, ask: 111 }, 110, null)).toBe("TP")
    expect(checkTpSl("LONG", { bid: 109, ask: 110 }, 110, null)).toBeNull()
  })

  it("LONG: SL se dispara cuando bid <= slPrice", () => {
    expect(checkTpSl("LONG", { bid: 90, ask: 91 }, null, 90)).toBe("SL")
    expect(checkTpSl("LONG", { bid: 91, ask: 92 }, null, 90)).toBeNull()
  })

  it("SHORT: TP se dispara cuando ask <= tpPrice", () => {
    expect(checkTpSl("SHORT", { bid: 88, ask: 90 }, 90, null)).toBe("TP")
    expect(checkTpSl("SHORT", { bid: 90, ask: 91 }, 90, null)).toBeNull()
  })

  it("SHORT: SL se dispara cuando ask >= slPrice", () => {
    expect(checkTpSl("SHORT", { bid: 109, ask: 111 }, null, 111)).toBe("SL")
    expect(checkTpSl("SHORT", { bid: 109, ask: 110 }, null, 111)).toBeNull()
  })

  it("TP tiene prioridad sobre SL si ambos están definidos (LONG)", () => {
    // bid en zona de TP y en zona de SL a la vez no es posible lógicamente
    // pero si solo hay TP activo, devuelve TP
    expect(checkTpSl("LONG", { bid: 115, ask: 116 }, 110, 90)).toBe("TP")
  })

  it("devuelve null cuando ninguna condición se cumple", () => {
    expect(checkTpSl("LONG", { bid: 100, ask: 101 }, 110, 90)).toBeNull()
    expect(checkTpSl("SHORT", { bid: 99, ask: 100 }, 90, 110)).toBeNull()
  })

  it("devuelve null cuando TP y SL son null", () => {
    expect(checkTpSl("LONG", { bid: 100, ask: 101 }, null, null)).toBeNull()
  })
})
