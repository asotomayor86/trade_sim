/**
 * Seed F12: create the 7 standard strategies.
 * Run AFTER seedAnalysesV2 so the analyses exist.
 * Run: npx tsx prisma/seedStrategies.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function findAnalysis(code: string) {
  const a = await prisma.analysis.findUnique({ where: { code } })
  if (!a) throw new Error(`Analysis with code "${code}" not found. Run seedAnalysesV2 first.`)
  return a
}

async function main() {
  const [TND, RSB, BRK, SCP, VWP] = await Promise.all([
    findAnalysis("TND"),
    findAnalysis("RSB"),
    findAnalysis("BRK"),
    findAnalysis("SCP"),
    findAnalysis("VWP"),
  ])

  const STRATEGIES = [
    {
      code: "TND-LONG",
      name: "Tendencia clásica - Largo",
      description: "Compra cuando EMA20 cruza al alza EMA50 con MACD positivo.",
      analysisId: TND.id,
      suffix: "LONG" as const,
      entryRule: "EMA_CROSS_UP" as const,
      entryParams: { ema_fast: 20, ema_slow: 50, macd_confirmation: true },
      exitTargetType: "PERCENT_GAIN" as const,
      exitTargetValue: 3,
      stopLossType: "PERCENT" as const,
      stopLossValue: 1.5,
    },
    {
      code: "TND-SHORT",
      name: "Tendencia clásica - Corto",
      description: "Vende cuando EMA20 cruza a la baja EMA50 con MACD negativo.",
      analysisId: TND.id,
      suffix: "SHORT" as const,
      entryRule: "EMA_CROSS_DOWN" as const,
      entryParams: { ema_fast: 20, ema_slow: 50, macd_confirmation: true },
      exitTargetType: "PERCENT_GAIN" as const,
      exitTargetValue: 3,
      stopLossType: "PERCENT" as const,
      stopLossValue: 1.5,
    },
    {
      code: "RSB-BNC",
      name: "Rebote sobreventa - Bounce",
      description: "Compra en zona de sobreventa extrema cuando RSI < 30 y precio toca banda inferior de Bollinger.",
      analysisId: RSB.id,
      suffix: "BNC" as const,
      entryRule: "RSI_OVERSOLD_BB_LOWER" as const,
      entryParams: { rsi_threshold: 30, bb_period: 20 },
      exitTargetType: "BOLLINGER_MIDDLE" as const,
      exitTargetValue: 0,
      stopLossType: "PERCENT" as const,
      stopLossValue: 2,
    },
    {
      code: "BRK-UP",
      name: "Breakout alcista",
      description: "Compra en ruptura de banda superior de Bollinger con volumen mayor a 1.5× la media.",
      analysisId: BRK.id,
      suffix: "UP" as const,
      entryRule: "BB_BREAKOUT_UP_VOLUME" as const,
      entryParams: { bb_period: 20, volume_multiplier: 1.5 },
      exitTargetType: "PERCENT_GAIN" as const,
      exitTargetValue: 4,
      stopLossType: "BOLLINGER_MIDDLE" as const,
      stopLossValue: 0,
    },
    {
      code: "BRK-DN",
      name: "Breakout bajista",
      description: "Vende en ruptura de banda inferior de Bollinger con volumen mayor a 1.5× la media.",
      analysisId: BRK.id,
      suffix: "DN" as const,
      entryRule: "BB_BREAKOUT_DOWN_VOLUME" as const,
      entryParams: { bb_period: 20, volume_multiplier: 1.5 },
      exitTargetType: "PERCENT_GAIN" as const,
      exitTargetValue: 4,
      stopLossType: "BOLLINGER_MIDDLE" as const,
      stopLossValue: 0,
    },
    {
      code: "SCP-LONG",
      name: "Scalping rápido - Largo",
      description: "Compra cuando precio está sobre EMA9 y Estocástico cruza al alza desde zona de sobreventa.",
      analysisId: SCP.id,
      suffix: "LONG" as const,
      entryRule: "EMA_STOCH_CROSS" as const,
      entryParams: { ema_period: 9, stoch_oversold: 20 },
      exitTargetType: "PERCENT_GAIN" as const,
      exitTargetValue: 1,
      stopLossType: "PERCENT" as const,
      stopLossValue: 0.5,
    },
    {
      code: "VWP-BNC",
      name: "Reversión a VWAP - Bounce",
      description: "Compra cuando precio está > 1% por debajo del VWAP con RSI < 40.",
      analysisId: VWP.id,
      suffix: "BNC" as const,
      entryRule: "VWAP_DEVIATION_RSI" as const,
      entryParams: { vwap_deviation_pct: 1, rsi_threshold: 40 },
      exitTargetType: "VWAP_TOUCH" as const,
      exitTargetValue: 0,
      stopLossType: "PERCENT" as const,
      stopLossValue: 1.5,
    },
  ]

  for (const s of STRATEGIES) {
    await prisma.strategy.upsert({
      where: { code: s.code },
      create: { ...s, isStandard: true },
      update: { name: s.name, description: s.description, isStandard: true },
    })
    console.log(`✓ Strategy: ${s.code} — ${s.name}`)
  }

  console.log("Seed strategies completado.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
