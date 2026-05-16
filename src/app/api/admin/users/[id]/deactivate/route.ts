import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    const activeAdmins = await tx.user.count({
      where: { role: "ADMIN", active: true, id: { not: id } },
    })
    const target = await tx.user.findUnique({ where: { id }, select: { role: true } })
    if (!target) throw new Error("Not found")

    if (target.role === "ADMIN" && activeAdmins < 1) {
      throw new Error("Debe quedar al menos un admin activo")
    }

    await tx.user.update({ where: { id }, data: { active: false, deactivatedAt: new Date() } })
    await tx.userAuditLog.create({
      data: { actorId: session.user.id, targetId: id, action: "DEACTIVATE" },
    })
  })

  return NextResponse.json({ ok: true })
}
