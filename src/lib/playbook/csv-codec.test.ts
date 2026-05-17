import { describe, it, expect } from "vitest"
import {
  serializeAnalysisToCsv, parseAnalysisCsv,
  serializeStrategyToCsv, parseStrategyCsv,
  parseCsvRow, inferCsvType,
  type SerializableAnalysis, type SerializableStrategy,
} from "./csv-codec"

// ---- parseCsvRow ----

describe("parseCsvRow", () => {
  it("splits simple fields", () => {
    expect(parseCsvRow("a,b,c")).toEqual(["a", "b", "c"])
  })

  it("handles quoted field with comma inside", () => {
    expect(parseCsvRow('"hello, world",b')).toEqual(["hello, world", "b"])
  })

  it("unescapes doubled quotes inside quoted field", () => {
    expect(parseCsvRow('"say ""hi""",b')).toEqual(['say "hi"', "b"])
  })

  it("handles quoted field with newline inside", () => {
    expect(parseCsvRow('"line1\nline2",next')).toEqual(["line1\nline2", "next"])
  })

  it("empty fields", () => {
    expect(parseCsvRow("a,,c")).toEqual(["a", "", "c"])
  })
})

// ---- Analysis roundtrip ----

const sampleAnalysis: SerializableAnalysis = {
  code: "TND",
  name: "Tendencia clásica",
  descripcion: "Seguimiento de tendencia",
  bias: "NEUTRAL",
  isStandard: true,
  indicators: [
    { tipo: "EMA", params: { periodo: 20 }, color: "#f59e0b", pane: 0, localId: "abc" },
    { tipo: "MACD", params: { periodo_rapida: 12 }, color: "#a855f7", pane: 1, localId: "def" },
  ],
}

describe("Analysis CSV roundtrip", () => {
  it("serialize → parse → same data", () => {
    const csv = serializeAnalysisToCsv(sampleAnalysis)
    const result = parseAnalysisCsv(csv)
    expect("ok" in result).toBe(true)
    if (!("ok" in result)) return
    const { ok } = result
    expect(ok.code).toBe("TND")
    expect(ok.name).toBe("Tendencia clásica")
    expect(ok.description).toBe("Seguimiento de tendencia")
    expect(ok.bias).toBe("NEUTRAL")
    expect(ok.isStandard).toBe(true)
    expect(ok.indicators).toHaveLength(2)
  })

  it("CSV has exactly 2 non-empty lines", () => {
    const csv = serializeAnalysisToCsv(sampleAnalysis)
    const lines = csv.split("\n").filter((l) => l.trim() !== "")
    expect(lines).toHaveLength(2)
  })

  it("handles name with comma and quotes", () => {
    const a: SerializableAnalysis = { ...sampleAnalysis, name: 'Say "hello", world', code: "TST" }
    const csv = serializeAnalysisToCsv(a)
    const result = parseAnalysisCsv(csv)
    expect("ok" in result && result.ok.name).toBe('Say "hello", world')
  })

  it("handles empty description", () => {
    const a: SerializableAnalysis = { ...sampleAnalysis, descripcion: null }
    const result = parseAnalysisCsv(serializeAnalysisToCsv(a))
    expect("ok" in result && result.ok.description).toBe("")
  })
})

describe("parseAnalysisCsv errors", () => {
  it("returns error for missing line", () => {
    const result = parseAnalysisCsv("code,name,description,bias,isStandard,indicators")
    expect("error" in result).toBe(true)
  })

  it("returns error for missing column", () => {
    const result = parseAnalysisCsv("code,name\nTND,Tendencia")
    expect("error" in result).toBe(true)
    expect((result as { error: string }).error).toMatch(/Columna faltante/)
  })

  it("returns error for malformed JSON in indicators", () => {
    const csv = "code,name,description,bias,isStandard,indicators\nTND,Test,,NEUTRAL,false,{bad json}"
    const result = parseAnalysisCsv(csv)
    expect("error" in result).toBe(true)
    expect((result as { error: string }).error).toMatch(/JSON/)
  })

  it("returns error when code is empty", () => {
    const csv = "code,name,description,bias,isStandard,indicators\n,,Test,NEUTRAL,false,[]"
    const result = parseAnalysisCsv(csv)
    expect("error" in result).toBe(true)
  })
})

// ---- Strategy roundtrip ----

const sampleStrategy: SerializableStrategy = {
  code: "TND-LONG",
  name: "Tendencia - Largo",
  description: "Entrada en cruce alcista de EMAs",
  analysisCode: "TND",
  suffix: "LONG",
  entryRule: "EMA_CROSS_UP",
  entryParams: { ema_fast: 20, ema_slow: 50 },
  exitTargetType: "PERCENT_GAIN",
  exitTargetValue: 3,
  stopLossType: "PERCENT",
  stopLossValue: 1.5,
  isStandard: true,
}

describe("Strategy CSV roundtrip", () => {
  it("serialize → parse → same data", () => {
    const csv = serializeStrategyToCsv(sampleStrategy)
    const result = parseStrategyCsv(csv)
    expect("ok" in result).toBe(true)
    if (!("ok" in result)) return
    const { ok } = result
    expect(ok.code).toBe("TND-LONG")
    expect(ok.name).toBe("Tendencia - Largo")
    expect(ok.analysisCode).toBe("TND")
    expect(ok.suffix).toBe("LONG")
    expect(ok.entryRule).toBe("EMA_CROSS_UP")
    expect(ok.exitTargetValue).toBe(3)
    expect(ok.stopLossValue).toBe(1.5)
    expect(ok.isStandard).toBe(true)
    expect(ok.entryParams).toEqual({ ema_fast: 20, ema_slow: 50 })
  })

  it("CSV has exactly 2 non-empty lines", () => {
    const lines = serializeStrategyToCsv(sampleStrategy).split("\n").filter((l) => l.trim() !== "")
    expect(lines).toHaveLength(2)
  })

  it("handles description with commas", () => {
    const s: SerializableStrategy = { ...sampleStrategy, description: "A, B, C", code: "TST-LONG" }
    const result = parseStrategyCsv(serializeStrategyToCsv(s))
    expect("ok" in result && result.ok.description).toBe("A, B, C")
  })
})

describe("parseStrategyCsv errors", () => {
  it("returns error for missing column", () => {
    const result = parseStrategyCsv("code,name\nTND-LONG,Test")
    expect("error" in result).toBe(true)
  })

  it("returns error for malformed entryParams JSON", () => {
    const csv = `code,name,description,analysisCode,suffix,entryRule,entryParams,exitTargetType,exitTargetValue,stopLossType,stopLossValue,isStandard
TND-LONG,Test,,TND,LONG,EMA_CROSS_UP,{bad},PERCENT_GAIN,3,PERCENT,1.5,false`
    const result = parseStrategyCsv(csv)
    expect("error" in result).toBe(true)
  })

  it("returns error for non-numeric exitTargetValue", () => {
    const csv = `code,name,description,analysisCode,suffix,entryRule,entryParams,exitTargetType,exitTargetValue,stopLossType,stopLossValue,isStandard
TND-LONG,Test,,TND,LONG,EMA_CROSS_UP,{},PERCENT_GAIN,abc,PERCENT,1.5,false`
    const result = parseStrategyCsv(csv)
    expect("error" in result).toBe(true)
  })
})

// ---- inferCsvType ----

describe("inferCsvType", () => {
  it("detects analysis file", () => {
    expect(inferCsvType("analysis_TND.csv")).toBe("analysis")
  })

  it("detects strategy file", () => {
    expect(inferCsvType("strategy_TND-LONG.csv")).toBe("strategy")
  })

  it("returns unknown for other names", () => {
    expect(inferCsvType("data.csv")).toBe("unknown")
    expect(inferCsvType("strategy_TND-LONG.txt")).toBe("unknown")
  })

  it("is case-insensitive", () => {
    expect(inferCsvType("Analysis_TND.CSV")).toBe("analysis")
    expect(inferCsvType("Strategy_RSB-BNC.CSV")).toBe("strategy")
  })
})
