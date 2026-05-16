import { describe, it, expect } from "vitest"

// Pure helper that mirrors the transaction logic in the role/deactivate endpoints
function canChangeRole(
  targetId: string,
  newRole: "USER" | "ADMIN",
  currentRole: "USER" | "ADMIN",
  activeAdminsExcludingTarget: number
): { allowed: boolean; reason?: string } {
  if (newRole === "USER" && currentRole === "ADMIN") {
    if (activeAdminsExcludingTarget < 1) {
      return { allowed: false, reason: "Debe quedar al menos un admin activo" }
    }
  }
  return { allowed: true }
}

function canDeactivate(
  targetRole: "USER" | "ADMIN",
  activeAdminsExcludingTarget: number
): { allowed: boolean; reason?: string } {
  if (targetRole === "ADMIN" && activeAdminsExcludingTarget < 1) {
    return { allowed: false, reason: "Debe quedar al menos un admin activo" }
  }
  return { allowed: true }
}

describe("canChangeRole — regla ≥1 admin activo", () => {
  it("permite degradar admin cuando quedan otros admins", () => {
    const res = canChangeRole("u1", "USER", "ADMIN", 2)
    expect(res.allowed).toBe(true)
  })

  it("bloquea degradar el último admin", () => {
    const res = canChangeRole("u1", "USER", "ADMIN", 0)
    expect(res.allowed).toBe(false)
    expect(res.reason).toMatch(/admin activo/)
  })

  it("permite promover usuario a admin siempre", () => {
    const res = canChangeRole("u1", "ADMIN", "USER", 0)
    expect(res.allowed).toBe(true)
  })

  it("permite degradar si hay exactamente 1 admin más", () => {
    const res = canChangeRole("u1", "USER", "ADMIN", 1)
    expect(res.allowed).toBe(true)
  })
})

describe("canDeactivate — regla ≥1 admin activo", () => {
  it("permite desactivar usuario normal siempre", () => {
    expect(canDeactivate("USER", 0).allowed).toBe(true)
    expect(canDeactivate("USER", 5).allowed).toBe(true)
  })

  it("bloquea desactivar el último admin", () => {
    const res = canDeactivate("ADMIN", 0)
    expect(res.allowed).toBe(false)
    expect(res.reason).toMatch(/admin activo/)
  })

  it("permite desactivar admin cuando quedan otros", () => {
    expect(canDeactivate("ADMIN", 1).allowed).toBe(true)
    expect(canDeactivate("ADMIN", 3).allowed).toBe(true)
  })
})
