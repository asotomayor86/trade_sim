import { describe, it, expect } from "vitest"
import { buildImportPreview, type ImportFile } from "./import-validator"
import { serializeAnalysisToCsv, serializeStrategyToCsv, type SerializableAnalysis, type SerializableStrategy } from "./csv-codec"

// ---- Fixtures ----

const analysisA: SerializableAnalysis = {
  code: "TND",
  name: "Tendencia clásica",
  descripcion: "Seguimiento de tendencia",
  bias: "NEUTRAL",
  isStandard: true,
  indicators: [{ tipo: "EMA", params: { periodo: 20 }, color: "#f59e0b", pane: 0, localId: "a1" }],
}

const analysisB: SerializableAnalysis = {
  code: "RSB",
  name: "Rebote sobreventa",
  descripcion: null,
  bias: "BULLISH",
  isStandard: false,
  indicators: [],
}

const strategyA: SerializableStrategy = {
  code: "TND-LONG",
  name: "Tendencia largo",
  description: "Entrada en cruce EMA",
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

function makeFile(filename: string, content: string): ImportFile {
  return { filename, content }
}

function analysisFile(a: SerializableAnalysis): ImportFile {
  return makeFile(`analysis_${a.code}.csv`, serializeAnalysisToCsv(a))
}

function strategyFile(s: SerializableStrategy): ImportFile {
  return makeFile(`strategy_${s.code}.csv`, serializeStrategyToCsv(s))
}

// ---- Roundtrip via preview ----

describe("buildImportPreview — roundtrip analysis", () => {
  it("parses and schedules analysis for creation", () => {
    const files = [analysisFile(analysisA)]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.errors).toHaveLength(0)
    expect(preview.limitError).toBeNull()
    expect(preview.analysesToCreate).toHaveLength(1)
    expect(preview.analysesToSkip).toHaveLength(0)

    const row = preview.analysesToCreate[0]
    expect(row.parsed.code).toBe("TND")
    expect(row.parsed.name).toBe("Tendencia clásica")
    expect(row.parsed.bias).toBe("NEUTRAL")
    expect(row.parsed.isStandard).toBe(true)
    expect(row.parsed.indicators).toHaveLength(1)
  })
})

describe("buildImportPreview — roundtrip strategy", () => {
  it("parses and schedules strategy for creation when analysisCode is in DB", () => {
    const files = [strategyFile(strategyA)]
    const preview = buildImportPreview(files, new Set(["TND"]), new Set(), 0)

    expect(preview.errors).toHaveLength(0)
    expect(preview.strategiesToCreate).toHaveLength(1)

    const row = preview.strategiesToCreate[0]
    expect(row.parsed.code).toBe("TND-LONG")
    expect(row.parsed.analysisCode).toBe("TND")
    expect(row.parsed.suffix).toBe("LONG")
    expect(row.parsed.entryRule).toBe("EMA_CROSS_UP")
    expect(row.parsed.exitTargetValue).toBe(3)
    expect(row.parsed.stopLossValue).toBe(1.5)
    expect(row.parsed.entryParams).toEqual({ ema_fast: 20, ema_slow: 50 })
  })

  it("resolves FK to analysis in same batch", () => {
    const files = [analysisFile(analysisA), strategyFile(strategyA)]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.errors).toHaveLength(0)
    expect(preview.analysesToCreate).toHaveLength(1)
    expect(preview.strategiesToCreate).toHaveLength(1)
  })
})

// ---- Skip by repeated code ----

describe("buildImportPreview — skip on duplicate code", () => {
  it("skips analysis whose code already exists in DB", () => {
    const files = [analysisFile(analysisA)]
    const preview = buildImportPreview(files, new Set(["TND"]), new Set(), 5)

    expect(preview.analysesToCreate).toHaveLength(0)
    expect(preview.analysesToSkip).toHaveLength(1)
    expect(preview.analysesToSkip[0].skipReason).toMatch(/ya existe en BD/)
    expect(preview.errors).toHaveLength(0)
    expect(preview.limitError).toBeNull()
  })

  it("skips strategy whose code already exists in DB", () => {
    const files = [strategyFile(strategyA)]
    const preview = buildImportPreview(files, new Set(["TND"]), new Set(["TND-LONG"]), 0)

    expect(preview.strategiesToCreate).toHaveLength(0)
    expect(preview.strategiesToSkip).toHaveLength(1)
    expect(preview.strategiesToSkip[0].skipReason).toMatch(/ya existe en BD/)
    expect(preview.errors).toHaveLength(0)
  })

  it("skips analysis that appears twice in the same batch", () => {
    const files = [analysisFile(analysisA), analysisFile(analysisA)]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.analysesToCreate).toHaveLength(1)
    expect(preview.analysesToSkip).toHaveLength(1)
    expect(preview.analysesToSkip[0].skipReason).toMatch(/duplicado en el lote/)
  })
})

// ---- FK validation ----

describe("buildImportPreview — FK validation", () => {
  it("produces error when analysisCode not in DB and not in batch", () => {
    const files = [strategyFile(strategyA)]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.errors).toHaveLength(1)
    expect(preview.errors[0].message).toMatch(/TND/)
    expect(preview.errors[0].message).toMatch(/no existe en BD/)
    expect(preview.strategiesToCreate).toHaveLength(0)
  })

  it("no FK error when skipped analysis still resolves FK", () => {
    // TND exists in DB (so it's skipped), but strategy can still reference it
    const files = [analysisFile(analysisA), strategyFile(strategyA)]
    const preview = buildImportPreview(files, new Set(["TND"]), new Set(), 0)

    expect(preview.errors).toHaveLength(0)
    expect(preview.strategiesToCreate).toHaveLength(1)
  })
})

// ---- Limit 15 analyses ----

describe("buildImportPreview — limit 15 analyses", () => {
  it("sets limitError when batch would exceed 15", () => {
    const files = [analysisFile(analysisA), analysisFile(analysisB)]
    const preview = buildImportPreview(files, new Set(), new Set(), 14)

    expect(preview.limitError).not.toBeNull()
    expect(preview.limitError).toMatch(/15/)
    expect(preview.limitError).toMatch(/1 hueco/)
  })

  it("no limitError when batch exactly fills remaining slots", () => {
    const files = [analysisFile(analysisA)]
    const preview = buildImportPreview(files, new Set(), new Set(), 14)

    expect(preview.limitError).toBeNull()
    expect(preview.analysesToCreate).toHaveLength(1)
  })

  it("no limitError when all new analyses are skipped (codes exist in DB)", () => {
    const files = [analysisFile(analysisA)]
    const preview = buildImportPreview(files, new Set(["TND"]), new Set(), 15)

    expect(preview.limitError).toBeNull()
    expect(preview.analysesToSkip).toHaveLength(1)
  })
})

// ---- Unknown filenames ----

describe("buildImportPreview — unknown file types", () => {
  it("produces error for unrecognized filename", () => {
    const files = [makeFile("data.csv", "code,name\nTND,Test")]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.errors).toHaveLength(1)
    expect(preview.errors[0].filename).toBe("data.csv")
    expect(preview.errors[0].message).toMatch(/no reconocido/)
  })

  it("processes valid files alongside unknown ones", () => {
    const files = [analysisFile(analysisA), makeFile("random.txt", "hello")]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.analysesToCreate).toHaveLength(1)
    expect(preview.errors).toHaveLength(1)
    expect(preview.errors[0].filename).toBe("random.txt")
  })
})

// ---- Parse errors ----

describe("buildImportPreview — parse errors", () => {
  it("records error for malformed analysis CSV", () => {
    const files = [makeFile("analysis_BAD.csv", "code,name\nBAD,Only two columns")]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.errors).toHaveLength(1)
    expect(preview.errors[0].filename).toBe("analysis_BAD.csv")
  })

  it("records error for malformed strategy CSV", () => {
    const files = [makeFile("strategy_BAD-LONG.csv", "code,name\nBAD-LONG,Only two columns")]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.errors).toHaveLength(1)
    expect(preview.errors[0].filename).toBe("strategy_BAD-LONG.csv")
  })
})

// ---- Mixed batch ----

describe("buildImportPreview — mixed batch", () => {
  it("handles batch with analyses and strategies together", () => {
    const stratB: SerializableStrategy = {
      ...strategyA,
      code: "RSB-BNC",
      name: "Rebote - Bounce",
      analysisCode: "RSB",
      suffix: "BNC",
    }
    const files = [
      analysisFile(analysisA),
      analysisFile(analysisB),
      strategyFile(strategyA),
      strategyFile(stratB),
    ]
    const preview = buildImportPreview(files, new Set(), new Set(), 0)

    expect(preview.errors).toHaveLength(0)
    expect(preview.limitError).toBeNull()
    expect(preview.analysesToCreate).toHaveLength(2)
    expect(preview.strategiesToCreate).toHaveLength(2)
  })
})
