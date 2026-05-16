import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"

const PAGE_SIZE = 20

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const sp = req.nextUrl.searchParams
  const status = sp.get("status") ?? "closed"
  const cursor = sp.get("cursor") ?? undefined
  const sector = sp.get("sector") ?? undefined
  const analysisId = sp.get("analysisId") ?? undefined

  if (status === "open") {
    const ops = await prisma.operation.findMany({
      where: {
        userId: id, closedAt: null,
        ...(sector && { ticker: { sector } }),
        ...(analysisId && { analysisId }),
      },
      orderBy: { openedAt: "desc" },
      include: {
        ticker: { select: { symbol: true, name: true, sector: true } },
        analysis: { select: { name: true } },
      },
    })
    return NextResponse.json({ ops, nextCursor: null })
  }

  // Closed — cursor pagination by (closedAt DESC, id DESC)
  const ops = await prisma.operation.findMany({
    where: {
      userId: id,
      closedAt: { not: null },
      ...(sector && { ticker: { sector } }),
      ...(analysisId && { analysisId }),
    },
    orderBy: [{ closedAt: "desc" }, { id: "desc" }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: PAGE_SIZE + 1,
    include: {
      ticker: { select: { symbol: true, name: true, sector: true } },
      analysis: { select: { name: true } },
    },
  })

  const hasMore = ops.length > PAGE_SIZE
  const page = hasMore ? ops.slice(0, PAGE_SIZE) : ops
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return NextResponse.json({ ops: page, nextCursor })
}
