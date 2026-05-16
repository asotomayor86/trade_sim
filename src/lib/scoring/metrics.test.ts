import { describe, it, expect } from "vitest"
import { computeRanking, computeUserMetrics } from "./metrics"

const u1 = { userId: "u1", username: "alice" }
const u2 = { userId: "u2", username: "bob" }

function op(user: typeof u1, pnl: number, pnlPct: number) {
  return { ...user, pnl, pnlPct }
}

describe("computeRanking", () => {
  it("lista vacía → resultado vacío", () => {
    expect(computeRanking([])).toEqual([])
  })

  it("un usuario, una operación", () => {
    const result = computeRanking([op(u1, 5, 5)])
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe("alice")
    expect(result[0].avgReturn).toBeCloseTo(5)
    expect(result[0].winRate).toBeCloseTo(100)
    expect(result[0].totalTrades).toBe(1)
    expect(result[0].totalPnl).toBeCloseTo(5)
  })

  it("avgReturn es media aritmética de pnlPct", () => {
    const ops = [op(u1, 10, 10), op(u1, -5, -5), op(u1, 15, 15)]
    const [row] = computeRanking(ops)
    expect(row.avgReturn).toBeCloseTo((10 - 5 + 15) / 3)
  })

  it("winRate = % de operaciones con pnl > 0", () => {
    const ops = [op(u1, 5, 5), op(u1, -3, -3), op(u1, 2, 2), op(u1, -1, -1)]
    const [row] = computeRanking(ops)
    expect(row.winRate).toBeCloseTo(50)
  })

  it("ordena por avgReturn descendente", () => {
    const ops = [
      op(u1, 2, 2),
      op(u2, 10, 10),
    ]
    const result = computeRanking(ops)
    expect(result[0].username).toBe("bob")
    expect(result[1].username).toBe("alice")
  })

  it("usuario con todas las operaciones perdedoras tiene winRate 0", () => {
    const ops = [op(u1, -5, -5), op(u1, -3, -3)]
    const [row] = computeRanking(ops)
    expect(row.winRate).toBe(0)
    expect(row.avgReturn).toBeCloseTo(-4)
  })

  it("totalPnl es la suma de pnl", () => {
    const ops = [op(u1, 10, 10), op(u1, -3, -3), op(u1, 7, 7)]
    const [row] = computeRanking(ops)
    expect(row.totalPnl).toBeCloseTo(14)
  })

  it("agrupa correctamente varios usuarios", () => {
    const ops = [
      op(u1, 5, 5), op(u1, 5, 5),   // alice: avg 5
      op(u2, 10, 10), op(u2, 0, 0),  // bob: avg 5
    ]
    const result = computeRanking(ops)
    expect(result).toHaveLength(2)
    expect(result[0].totalTrades).toBe(2)
    expect(result[1].totalTrades).toBe(2)
  })
})

describe("computeUserMetrics", () => {
  it("sin operaciones → ceros", () => {
    const m = computeUserMetrics([])
    expect(m.avgReturn).toBe(0)
    expect(m.winRate).toBe(0)
    expect(m.totalTrades).toBe(0)
    expect(m.totalPnl).toBe(0)
  })

  it("calcula métricas correctamente con datos reales", () => {
    const ops = [
      { pnl: 8, pnlPct: 8 },
      { pnl: -2, pnlPct: -2 },
      { pnl: 4, pnlPct: 4 },
    ]
    const m = computeUserMetrics(ops)
    expect(m.totalTrades).toBe(3)
    expect(m.avgReturn).toBeCloseTo((8 - 2 + 4) / 3)
    expect(m.winRate).toBeCloseTo((2 / 3) * 100)
    expect(m.totalPnl).toBeCloseTo(10)
  })
})
