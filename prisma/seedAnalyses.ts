import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ANALYSES = [
  {
    name: "Alcista · EMA50/EMA200 + RSI14 · Rebote en soporte",
    bias: "BULLISH" as const,
    indicators: [
      { type: "EMA", params: { period: 50 }, color: "#f59e0b", pane: 0 },
      { type: "EMA", params: { period: 200 }, color: "#3b82f6", pane: 0 },
      { type: "RSI", params: { period: 14 }, color: "#a855f7", pane: 2 },
      { type: "VOLUME", params: {}, color: "#334155", pane: 1 },
    ],
    rules: [
      {
        type: "ENTRY" as const,
        direction: "LONG" as const,
        description: "Precio toca soporte ±0.5% Y RSI < 35 Y precio > EMA(200)",
        condition: { indicators: ["RSI<35", "price>EMA200", "price_near_support"] },
      },
      {
        type: "EXIT_TP" as const,
        direction: "LONG" as const,
        description: "EMA(50) o resistencia previa",
        condition: { target: "EMA50_or_resistance" },
      },
      {
        type: "EXIT_SL" as const,
        direction: "LONG" as const,
        description: "-2% bajo el soporte",
        condition: { pct: -2, reference: "support" },
      },
    ],
  },
  {
    name: "Bajista · MACD + Bollinger20,2 + Volumen · Ruptura de canal",
    bias: "BEARISH" as const,
    indicators: [
      { type: "MACD", params: { fast: 12, slow: 26, signal: 9 }, color: "#3b82f6", pane: 3 },
      { type: "BOLLINGER", params: { period: 20, stdDev: 2 }, color: "#7c3aed", pane: 0 },
      { type: "VOLUME", params: {}, color: "#334155", pane: 1 },
    ],
    rules: [
      {
        type: "ENTRY" as const,
        direction: "SHORT" as const,
        description: "Cierre bajo línea de tendencia Y cruce bajista MACD Y volumen > SMA20 volumen",
        condition: { indicators: ["MACD_bearish_cross", "close<trendline", "volume>SMA20vol"] },
      },
      {
        type: "EXIT_TP" as const,
        direction: "SHORT" as const,
        description: "Banda inferior de Bollinger o siguiente soporte",
        condition: { target: "bollinger_lower_or_support" },
      },
      {
        type: "EXIT_SL" as const,
        direction: "SHORT" as const,
        description: "+1.5% sobre la línea rota",
        condition: { pct: 1.5, reference: "broken_line" },
      },
    ],
  },
  {
    name: "Alcista · EMA20/EMA50 + ADX14 · Continuación de tendencia",
    bias: "BULLISH" as const,
    indicators: [
      { type: "EMA", params: { period: 20 }, color: "#f59e0b", pane: 0 },
      { type: "EMA", params: { period: 50 }, color: "#3b82f6", pane: 0 },
      { type: "ADX", params: { period: 14 }, color: "#22c55e", pane: 2 },
    ],
    rules: [
      {
        type: "ENTRY" as const,
        direction: "LONG" as const,
        description: "Retroceso a EMA(20) Y EMA(20) > EMA(50) Y ADX > 20",
        condition: { indicators: ["price_near_EMA20", "EMA20>EMA50", "ADX>20"] },
      },
      {
        type: "EXIT_TP" as const,
        direction: "LONG" as const,
        description: "Parte alta del canal alcista",
        condition: { target: "channel_top" },
      },
      {
        type: "EXIT_SL" as const,
        direction: "LONG" as const,
        description: "Cierre bajo EMA(50)",
        condition: { indicator: "close<EMA50" },
      },
    ],
  },
  {
    name: "Neutro · Bollinger20,2 + RSI14 · Reversión a la media",
    bias: "NEUTRAL" as const,
    indicators: [
      { type: "BOLLINGER", params: { period: 20, stdDev: 2 }, color: "#7c3aed", pane: 0 },
      { type: "RSI", params: { period: 14 }, color: "#a855f7", pane: 2 },
      { type: "ATR", params: { period: 14 }, color: "#f59e0b", pane: 3 },
    ],
    rules: [
      {
        type: "ENTRY" as const,
        direction: "LONG" as const,
        description: "Toque banda inferior Bollinger Y RSI < 30",
        condition: { indicators: ["price<=bollinger_lower", "RSI<30"] },
      },
      {
        type: "ENTRY" as const,
        direction: "SHORT" as const,
        description: "Toque banda superior Bollinger Y RSI > 70",
        condition: { indicators: ["price>=bollinger_upper", "RSI>70"] },
      },
      {
        type: "EXIT_TP" as const,
        direction: null,
        description: "SMA(20) central de Bollinger",
        condition: { target: "bollinger_middle" },
      },
      {
        type: "EXIT_SL" as const,
        direction: null,
        description: "1 ATR(14) fuera de la banda tocada",
        condition: { multiplier: 1, indicator: "ATR14", reference: "touched_band" },
      },
    ],
  },
  {
    name: "Alcista · Ruptura · Donchian20 + Volumen",
    bias: "BULLISH" as const,
    indicators: [
      { type: "DONCHIAN", params: { period: 20 }, color: "#0ea5e9", pane: 0 },
      { type: "VOLUME", params: {}, color: "#334155", pane: 1 },
      { type: "ATR", params: { period: 14 }, color: "#f59e0b", pane: 2 },
    ],
    rules: [
      {
        type: "ENTRY" as const,
        direction: "LONG" as const,
        description: "Cierre > máximo Donchian(20) Y volumen > 1.5× SMA20 volumen",
        condition: { indicators: ["close>donchian20_high", "volume>1.5x_SMA20vol"] },
      },
      {
        type: "EXIT_TP" as const,
        direction: "LONG" as const,
        description: "Trailing stop a 2× ATR(14)",
        condition: { trailing: true, multiplier: 2, indicator: "ATR14" },
      },
      {
        type: "EXIT_SL" as const,
        direction: "LONG" as const,
        description: "Bajo el máximo roto (Donchian anterior)",
        condition: { reference: "donchian20_high_previous" },
      },
    ],
  },
]

async function main() {
  let created = 0

  for (const a of ANALYSES) {
    const existing = await prisma.analysis.findFirst({
      where: { name: a.name, isStandard: true },
    })
    if (existing) continue

    await prisma.analysis.create({
      data: {
        name: a.name,
        nameCustom: true,
        bias: a.bias,
        isStandard: true,
        userId: null,
        indicators: { create: a.indicators },
        rules: { create: a.rules },
      },
    })
    created++
  }

  console.log(`✓ Análisis estándar: ${created} creados (${ANALYSES.length - created} ya existían)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
