import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { hashPassword } from "@/lib/auth/passwords"

function generateTempPassword(len = 16) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let p = ""
  for (let i = 0; i < len; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { passwordHash, lastPasswordResetAt: new Date() },
    })
    await tx.userAuditLog.create({
      data: {
        actorId: session.user.id,
        targetId: id,
        action: "RESET_PASSWORD",
        metadata: { hint: "temp password set by admin" },
      },
    })
  })

  return NextResponse.json({ tempPassword })
}
