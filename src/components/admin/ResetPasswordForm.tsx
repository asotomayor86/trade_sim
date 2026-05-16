"use client"

import { useActionState, useState } from "react"
import { resetUserPassword } from "@/actions/users"

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(resetUserPassword, null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-blue-600 hover:text-blue-500"
      >
        Reset password
      </button>
    )
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input
        name="newPassword"
        type="password"
        placeholder="Nueva contraseña"
        required
        minLength={8}
        className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "…" : "Guardar"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        Cancelar
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  )
}
