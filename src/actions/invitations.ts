"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"
import { hashPassword } from "@/lib/auth/passwords"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function createInvitationCode(note?: string) {
  await requireAdmin()

  const code = await prisma.invitationCode.create({
    data: { note: note ?? null },
  })

  revalidatePath("/admin/invitations")
  return code
}

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guiones bajos"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  code: z.string().min(1, "Código requerido"),
})

export async function registerWithCode(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const raw = {
    username: formData.get("username"),
    password: formData.get("password"),
    code: formData.get("code"),
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? "Datos inválidos" }
  }

  const { username, password, code } = parsed.data

  const invitation = await prisma.invitationCode.findUnique({ where: { code } })

  if (
    !invitation ||
    invitation.usedAt ||
    (invitation.expiresAt && invitation.expiresAt < new Date())
  ) {
    return { error: "Código de invitación inválido o ya utilizado" }
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return { error: "El nombre de usuario ya está en uso" }
  }

  const passwordHash = await hashPassword(password)

  await prisma.$transaction([
    prisma.user.create({ data: { username, passwordHash } }),
    prisma.invitationCode.update({
      where: { id: invitation.id },
      data: { usedAt: new Date(), usedBy: username },
    }),
  ])

  redirect("/login?registered=1")
}
