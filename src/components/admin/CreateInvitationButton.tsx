"use client"

import { useTransition, useState } from "react"
import { createInvitationCode } from "@/actions/invitations"

export function CreateInvitationButton() {
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState("")

  const handleCreate = () => {
    startTransition(async () => {
      await createInvitationCode(note || undefined)
      setNote("")
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota opcional"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        onClick={handleCreate}
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Nuevo código"}
      </button>
    </div>
  )
}
