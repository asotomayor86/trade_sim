"use client"

import { useState } from "react"
import { logoutAction } from "@/actions/auth"

export function UserMenu({ username, role }: { username: string; role: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {username[0]?.toUpperCase()}
        </span>
        <span>{username}</span>
        {role === "ADMIN" && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
            Admin
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
