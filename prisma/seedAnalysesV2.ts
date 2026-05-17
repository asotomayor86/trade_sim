/**
 * Seed F12: upsert the 5 standard analyses with F11-compatible indicators and F12 codes.
 * Codes are assigned manually to match the spec seed table.
 * Run: npx tsx prisma/seedAnalysesV2.ts
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ANALYSES = [
  {
    code: "TND",
    name: "Tendencia clásica",
    descripcion: "Seguimiento de tendencia con medias móviles y MACD.",
    indicators: [
      { tipo: "EMA", params: { periodo: 20 }, color: "#f59e0b", pane: 0 },
      { tipo: "EMA", params: { periodo: 50 }, color: "#3b82f6", pane: 0 },
      { tipo: "MACD", params: { periodo_rapida: 12, periodo_lenta: 26, "periodo_señal": 9 }, color: "#a855f7", pane: 1 },
    ],
  },
  {
    code: "RSB",
    name: "Rebote sobreventa",
    descripcion: "Reversal en zonas de sobreventa extrema con RSI y Bollinger.",
    indicators: [
      { tipo: "BB", params: { periodo: 20, desviaciones: 2 }, color: "#7c3aed", pane: 0 },
      { tipo: "RSI", params: { periodo: 14, nivel_sobrecompra: 70, nivel_sobreventa: 30 }, color: "#10b981", pane: 1 },
    ],
  },
  {
    code: "BRK",
    name: "Breakout",
    descripcion: "Rupturas de bandas con confirmación de volumen.",
    indicators: [
      { tipo: "BB", params: { periodo: 20, desviaciones: 2 }, color: "#0ea5e9", pane: 0 },
      { tipo: "VOL", params: { mostrar_media: true, periodo_media: 20 }, color: "#334155", pane: 1 },
    ],
  },
  {
    code: "SCP",
    name: "Scalping rápido",
    descripcion: "Movimientos cortos con EMA rápida y Estocástico.",
    indicators: [
      { tipo: "EMA", params: { periodo: 9 }, color: "#f97316", pane: 0 },
      { tipo: "STOCH", params: { periodo_k: 14, periodo_d: 3, suavizado: 3, nivel_sobrecompra: 80, nivel_sobreventa: 20 }, color: "#ec4899", pane: 1 },
    ],
  },
  {
    code: "VWP",
    name: "Reversión a VWAP",
    descripcion: "Reversión al precio promedio ponderado por volumen con RSI de confirmación.",
    indicators: [
      { tipo: "VWAP", params: { periodo_reset: "sesion" }, color: "#84cc16", pane: 0 },
      { tipo: "RSI", params: { periodo: 14, nivel_sobrecompra: 70, nivel_sobreventa: 30 }, color: "#06b6d4", pane: 1 },
    ],
  },
]

async function main() {
  for (const a of ANALYSES) {
    const existing = await prisma.analysis.findFirst({
      where: { name: a.name, deleted: false },
    })

    if (existing) {
      // Update code and descripcion on existing record
      await prisma.analysis.update({
        where: { id: existing.id },
        data: { code: a.code, descripcion: a.descripcion, isStandard: true },
      })
      console.log(`✓ Updated analysis: ${a.name} (${a.code})`)
    } else {
      await prisma.analysis.create({
        data: {
          code: a.code,
          name: a.name,
          descripcion: a.descripcion,
          nameCustom: true,
          bias: "NEUTRAL",
          isStandard: true,
          indicators: {
            create: a.indicators.map((ind) => ({
              localId: `${a.code}-${ind.tipo}`,
              type: ind.tipo,
              params: ind.params as object,
              color: ind.color,
              lineWidth: 1,
              lineStyle: 0,
              pane: ind.pane,
            })),
          },
        },
      })
      console.log(`✓ Created analysis: ${a.name} (${a.code})`)
    }
  }

  console.log("Seed analyses V2 completado.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
