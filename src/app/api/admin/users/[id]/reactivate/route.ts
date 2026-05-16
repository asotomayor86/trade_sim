import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { id: true } })
    if (!target) throw new Error("Not found")
    await tx.user.update({ where: { id }, data: { active: true, deactivatedAt: null } })
    await tx.userAuditLog.create({
      data: { actorId: session.user.id, targetId: id, action: "REACTIVATE" },
    })
  })

  return NextResponse.json({ ok: true })
}
