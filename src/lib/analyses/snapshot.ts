import { prisma } from "@/lib/db/prisma"

export async function createAnalysisSnapshot(analysisId: string): Promise<string> {
  const analysis = await prisma.analysis.findUniqueOrThrow({
    where: { id: analysisId },
    include: { indicators: true, rules: true },
  })

  const snapshot = await prisma.analysisSnapshot.create({
    data: {
      analysisId,
      data: {
        id: analysis.id,
        name: analysis.name,
        bias: analysis.bias,
        indicators: analysis.indicators.map((i) => ({
          type: i.type,
          params: i.params,
          color: i.color,
          pane: i.pane,
        })),
        rules: analysis.rules.map((r) => ({
          type: r.type,
          direction: r.direction,
          condition: r.condition,
          description: r.description,
        })),
        snapshotAt: new Date().toISOString(),
      },
    },
  })

  return snapshot.id
}
