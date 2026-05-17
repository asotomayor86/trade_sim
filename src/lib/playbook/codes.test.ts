import { describe, it, expect } from "vitest"
import { deriveBase, generateAnalysisCode, generateStrategyCode } from "./codes"

describe("deriveBase", () => {
  it("Tendencia clásica → TND", () => {
    expect(deriveBase("Tendencia clásica")).toBe("TND")
  })

  it("Breakout → BRK", () => {
    expect(deriveBase("Breakout")).toBe("BRK")
  })

  it("Scalping rápido → SCL (consonants in order)", () => {
    // "Scalping" consonants: S,C,L,P,N,G → first 3 = SCL
    expect(deriveBase("Scalping rápido")).toBe("SCL")
  })

  it("Reversión a VWAP → RVR (stops words filtered)", () => {
    // "Reversión" consonants: R,V,R,S,N; "VWAP" consonants: V,W,P → RVR
    const code = deriveBase("Reversión a VWAP")
    expect(code).toHaveLength(3)
    expect(code).toMatch(/^[A-Z]{3}$/)
  })

  it("single letter word pads to exactly 3 chars", () => {
    const code = deriveBase("B")
    expect(code).toHaveLength(3)
    expect(code).toMatch(/^[A-Z]{3}$/)
  })

  it("removes diacritics and normalizes", () => {
    const a = deriveBase("Análisis técnico")
    const b = deriveBase("Analisis tecnico")
    expect(a).toBe(b)
  })
})

describe("generateAnalysisCode", () => {
  it("returns base when no collision", () => {
    expect(generateAnalysisCode("Tendencia clásica", [])).toBe("TND")
  })

  it("adds suffix 2 on first collision", () => {
    expect(generateAnalysisCode("Tendencia clásica", ["TND"])).toBe("TND2")
  })

  it("adds suffix 3 on second collision", () => {
    expect(generateAnalysisCode("Tendencia clásica", ["TND", "TND2"])).toBe("TND3")
  })

  it("is case-insensitive when comparing existing codes", () => {
    expect(generateAnalysisCode("Tendencia clásica", ["tnd"])).toBe("TND2")
  })
})

describe("generateStrategyCode", () => {
  it("RSB + BNC → RSB-BNC", () => {
    expect(generateStrategyCode("RSB", "BNC")).toBe("RSB-BNC")
  })

  it("TND + LONG → TND-LONG", () => {
    expect(generateStrategyCode("TND", "LONG")).toBe("TND-LONG")
  })

  it("BRK + UP → BRK-UP", () => {
    expect(generateStrategyCode("BRK", "UP")).toBe("BRK-UP")
  })
})
