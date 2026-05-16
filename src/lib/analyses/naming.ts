export type IndicatorType =
  | "EMA" | "SMA" | "RSI" | "MACD"
  | "BOLLINGER" | "ATR" | "ADX" | "DONCHIAN" | "VOLUME"

export interface IndicatorCfg {
  type: IndicatorType
  params: Record<string, number>
}

export type Bias = "BULLISH" | "BEARISH" | "NEUTRAL"

function biasLabel(bias: Bias): string {
  return { BULLISH: "Alcista", BEARISH: "Bajista", NEUTRAL: "Neutro" }[bias]
}

function indicatorLabel(cfg: IndicatorCfg): string {
  const p = cfg.params
  switch (cfg.type) {
    case "EMA":      return `EMA${p.period ?? ""}`
    case "SMA":      return `SMA${p.period ?? ""}`
    case "RSI":      return `RSI${p.period ?? ""}`
    case "MACD":     return `MACD(${p.fast ?? 12},${p.slow ?? 26},${p.signal ?? 9})`
    case "BOLLINGER": return `Bollinger${p.period ?? ""},${p.stdDev ?? 2}`
    case "ATR":      return `ATR${p.period ?? ""}`
    case "ADX":      return `ADX${p.period ?? ""}`
    case "DONCHIAN": return `Donchian${p.period ?? ""}`
    case "VOLUME":   return "Volumen"
  }
}

export function generateAnalysisName(
  bias: Bias,
  indicators: IndicatorCfg[],
  trigger: string
): string {
  const biasStr = biasLabel(bias)

  // Up to 3 key indicators
  const keyIndicators = indicators
    .slice(0, 3)
    .map(indicatorLabel)
    .join(" + ")

  const triggerStr = trigger.trim() || "Sin trigger"

  return `${biasStr} · ${keyIndicators || "Sin indicadores"} · ${triggerStr}`
}
