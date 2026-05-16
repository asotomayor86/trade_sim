import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"

const PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const cursor = sp.get("cursor") ?? undefined
  const targetId = sp.get("targetId") ?? undefined

  const logs = await prisma.userAuditLog.findMany({
    where: { ...(targetId && { targetId }) },
    orderBy: { createdAt: "desc" },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: PAGE_SIZE + 1,
    include: {
      actor: { select: { username: true } },
      target: { select: { username: true } },
    },
  })

  const hasMore = logs.length > PAGE_SIZE
  const page = hasMore ? logs.slice(0, PAGE_SIZE) : logs
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return NextResponse.json({ logs: page, nextCursor })
}
