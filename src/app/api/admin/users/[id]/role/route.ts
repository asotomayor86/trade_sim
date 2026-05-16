import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const schema = z.object({ newRole: z.enum(["USER", "ADMIN"]) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Rol inválido" }, { status: 400 })

  const { newRole } = body.data

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { role: true, active: true } })
      if (!target) throw new Error("Not found")

      if (newRole === "USER" && target.role === "ADMIN") {
        const remainingAdmins = await tx.user.count({
          where: { role: "ADMIN", active: true, id: { not: id } },
        })
        if (remainingAdmins < 1) throw new Error("Debe quedar al menos un admin activo")
      }

      await tx.user.update({ where: { id }, data: { role: newRole } })
      await tx.userAuditLog.create({
        data: {
          actorId: session.user.id,
          targetId: id,
          action: "ROLE_CHANGE",
          metadata: { from: target.role, to: newRole },
        },
      })
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
