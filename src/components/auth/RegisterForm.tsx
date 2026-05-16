"use client"

import { useActionState } from "react"
import { registerWithCode } from "@/actions/invitations"

export function RegisterForm({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const [state, action, pending] = useActionState(registerWithCode, null)

  const fieldError = (field: string) =>
    state?.field === field ? (
      <p className="mt-1 text-xs text-red-600">{state.error}</p>
    ) : null

  const generalError = !state?.field && state?.error

  return (
    <form action={action} className="space-y-4">
      {generalError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="space-y-1">
        <label htmlFor="code" className="block text-sm font-medium text-slate-700">
          Código de invitación
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
        {fieldError("code")}
      </div>

      <div className="space-y-1">
        <label htmlFor="username" className="block text-sm font-medium text-slate-700">
          Nombre de usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="tu_usuario"
        />
        <p className="text-xs text-slate-400">
          3–20 caracteres · letras, números, <code>-</code> y <code>_</code>
        </p>
        {fieldError("username")}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Mínimo 8 caracteres"
        />
        {fieldError("password")}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {pending ? "Registrando…" : "Crear cuenta"}
      </button>
    </form>
  )
}
