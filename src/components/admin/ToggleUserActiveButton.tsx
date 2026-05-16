"use client"

import { useTransition } from "react"
import { setUserActive } from "@/actions/users"

export function ToggleUserActiveButton({
  userId,
  active,
}: {
  userId: string
  active: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => setUserActive(userId, !active))}
      className={`text-xs font-medium disabled:opacity-50 ${
        active ? "text-red-600 hover:text-red-500" : "text-green-600 hover:text-green-500"
      }`}
    >
      {active ? "Desactivar" : "Activar"}
    </button>
  )
}
