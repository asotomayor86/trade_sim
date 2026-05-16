import { describe, it, expect } from "vitest"
import { generateAnalysisName, type Bias, type IndicatorCfg } from "./naming"

const ema50: IndicatorCfg  = { type: "EMA", params: { period: 50 } }
const rsi14: IndicatorCfg  = { type: "RSI", params: { period: 14 } }
const macd: IndicatorCfg   = { type: "MACD", params: { fast: 12, slow: 26, signal: 9 } }
const boll: IndicatorCfg   = { type: "BOLLINGER", params: { period: 20, stdDev: 2 } }
const vol: IndicatorCfg    = { type: "VOLUME", params: {} }

describe("generateAnalysisName", () => {
  it("incluye el sesgo correcto", () => {
    expect(generateAnalysisName("BULLISH", [ema50], "rebote")).toMatch(/Alcista/)
    expect(generateAnalysisName("BEARISH", [ema50], "ruptura")).toMatch(/Bajista/)
    expect(generateAnalysisName("NEUTRAL", [ema50], "reversión")).toMatch(/Neutro/)
  })

  it("incluye los indicadores con sus parámetros", () => {
    const name = generateAnalysisName("BULLISH", [ema50, rsi14], "cruce")
    expect(name).toContain("EMA50")
    expect(name).toContain("RSI14")
  })

  it("limita a 3 indicadores clave", () => {
    const name = generateAnalysisName("NEUTRAL", [ema50, rsi14, macd, boll], "trigger")
    expect(name).toContain("EMA50")
    expect(name).toContain("RSI14")
    expect(name).toContain("MACD(12,26,9)")
    // El 4º (Bollinger) no debe aparecer
    expect(name).not.toContain("Bollinger")
  })

  it("incluye el trigger", () => {
    const name = generateAnalysisName("BULLISH", [ema50], "rebote en soporte")
    expect(name).toContain("rebote en soporte")
  })

  it("trigger vacío → 'Sin trigger'", () => {
    const name = generateAnalysisName("BULLISH", [ema50], "")
    expect(name).toContain("Sin trigger")
  })

  it("sin indicadores → 'Sin indicadores'", () => {
    const name = generateAnalysisName("BULLISH", [], "cruce")
    expect(name).toContain("Sin indicadores")
  })

  it("VOLUME no tiene parámetros en el label", () => {
    const name = generateAnalysisName("NEUTRAL", [vol], "")
    expect(name).toContain("Volumen")
  })

  it("MACD incluye los tres parámetros", () => {
    const name = generateAnalysisName("BEARISH", [macd], "cruce bajista")
    expect(name).toContain("MACD(12,26,9)")
  })

  it("BOLLINGER incluye periodo y stdDev", () => {
    const name = generateAnalysisName("NEUTRAL", [boll], "toque de banda")
    expect(name).toContain("Bollinger20,2")
  })

  it("formato separado por ·", () => {
    const name = generateAnalysisName("BULLISH", [ema50], "cruce")
    const parts = name.split(" · ")
    expect(parts).toHaveLength(3)
  })
})
