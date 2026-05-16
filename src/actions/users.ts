"use server"

import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"
import { hashPassword } from "@/lib/auth/passwords"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
})

export async function resetUserPassword(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin()

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function setUserActive(userId: string, active: boolean) {
  await requireAdmin()

  await prisma.user.update({
    where: { id: userId },
    data: { active },
  })

  revalidatePath("/admin/users")
}
