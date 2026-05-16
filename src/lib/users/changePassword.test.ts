import { describe, it, expect } from "vitest"
import { z } from "zod"

// Replicar la lógica de validación de changeMyPassword para testearla aislada
const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
})

function validateChangePassword(current: string, next: string) {
  return schema.safeParse({ currentPassword: current, newPassword: next })
}

describe("changeMyPassword — validaciones Zod", () => {
  it("acepta credenciales válidas", () => {
    expect(validateChangePassword("actual123", "nueva_segura_1").success).toBe(true)
  })

  it("rechaza contraseña actual vacía", () => {
    expect(validateChangePassword("", "nueva_segura_1").success).toBe(false)
  })

  it("rechaza nueva contraseña menor de 8 chars", () => {
    const res = validateChangePassword("actual123", "corta")
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toMatch(/8 caracteres/)
    }
  })

  it("rechaza nueva contraseña de exactamente 7 chars", () => {
    expect(validateChangePassword("actual123", "1234567").success).toBe(false)
  })

  it("acepta nueva contraseña de exactamente 8 chars", () => {
    expect(validateChangePassword("actual123", "12345678").success).toBe(true)
  })
})
