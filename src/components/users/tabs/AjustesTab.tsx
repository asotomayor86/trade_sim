"use client"

import { useState, useTransition } from "react"
import { changeMyPassword } from "@/actions/users"
import { signOut } from "next-auth/react"

type Mode = "self" | "admin" | "other"

interface PushSub {
  id: string
  endpoint: string
  createdAt: string
}

interface Props {
  mode: Mode
  targetId: string
  targetUsername: string
  targetActive: boolean
  targetRole: string
  pushSubs?: PushSub[]   // solo para self
}

// ── Change password (self) ──────────────────────────────────────────────────
function ChangePasswordForm() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [msg, setMsg] = useState<{ error?: string; success?: string } | null>(null)
  const [pending, start] = useTransition()

  const handleSubmit = () => {
    if (next !== confirm) { setMsg({ error: "Las contraseñas no coinciden" }); return }
    setMsg(null)
    start(async () => {
      const res = await changeMyPassword(current, next)
      if (res.error) setMsg({ error: res.error })
      else { setMsg({ success: "Contraseña actualizada" }); setCurrent(""); setNext(""); setConfirm("") }
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Cambiar contraseña</h3>
      {msg?.error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{msg.error}</p>}
      {msg?.success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">{msg.success}</p>}
      <input type="password" placeholder="Contraseña actual" value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      <input type="password" placeholder="Nueva contraseña (mín. 8 caracteres)" value={next}
        onChange={(e) => setNext(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      <input type="password" placeholder="Repetir nueva contraseña" value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      <button onClick={handleSubmit} disabled={pending}
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Guardando…" : "Actualizar contraseña"}
      </button>
    </div>
  )
}

// ── Admin actions ───────────────────────────────────────────────────────────
function AdminActions({ targetId, targetUsername, targetActive, targetRole }: {
  targetId: string; targetUsername: string; targetActive: boolean; targetRole: string
}) {
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function callAdmin(path: string, body?: object) {
    const res = await fetch(`/api/admin/users/${targetId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Error")
    return data
  }

  const handleReset = () => {
    if (!confirm(`¿Resetear contraseña de ${targetUsername}?`)) return
    setError(null)
    start(async () => {
      try {
        const data = await callAdmin("reset-password")
        setTempPassword(data.tempPassword)
      } catch (e) { setError(e instanceof Error ? e.message : "Error") }
    })
  }

  const handleToggleActive = () => {
    const action = targetActive ? "deactivate" : "reactivate"
    const msg = targetActive
      ? `¿Desactivar a ${targetUsername}?`
      : `¿Reactivar a ${targetUsername}?`
    if (!confirm(msg)) return
    setError(null)
    start(async () => {
      try {
        await callAdmin(action)
        window.location.reload()
      } catch (e) { setError(e instanceof Error ? e.message : "Error") }
    })
  }

  const handleRoleChange = (newRole: string) => {
    if (!confirm(`¿Cambiar rol de ${targetUsername} a ${newRole}?`)) return
    setError(null)
    start(async () => {
      try {
        await callAdmin("role", { newRole })
        window.location.reload()
      } catch (e) { setError(e instanceof Error ? e.message : "Error") }
    })
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">Acciones de administrador sobre {targetUsername}</h3>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      {/* Reset password */}
      <div className="rounded-lg border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Resetear contraseña</p>
        <p className="text-xs text-slate-500">Se generará una contraseña temporal que debes compartir por fuera con el usuario.</p>
        <button onClick={handleReset} disabled={pending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {pending ? "Generando…" : "Generar contraseña temporal"}
        </button>
        {tempPassword && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs text-amber-700 font-medium mb-1">Contraseña temporal (visible solo ahora):</p>
            <p className="font-mono text-sm font-bold text-amber-900 select-all">{tempPassword}</p>
          </div>
        )}
      </div>

      {/* Deactivate / Reactivate */}
      <div className="rounded-lg border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Estado de la cuenta</p>
        <p className="text-xs text-slate-500">
          {targetActive
            ? "El usuario puede iniciar sesión y operar normalmente."
            : "El usuario no puede iniciar sesión. Sus operaciones siguen su curso."}
        </p>
        <button
          onClick={handleToggleActive}
          disabled={pending}
          className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
            targetActive
              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          }`}
        >
          {pending ? "…" : targetActive ? "Desactivar usuario" : "Reactivar usuario"}
        </button>
      </div>

      {/* Role change */}
      <div className="rounded-lg border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Rol</p>
        <p className="text-xs text-slate-500">
          Rol actual: <strong>{targetRole}</strong>. Debe quedar siempre al menos un admin activo.
        </p>
        {targetRole === "USER" ? (
          <button onClick={() => handleRoleChange("ADMIN")} disabled={pending}
            className="rounded-md border border-purple-200 bg-purple-50 px-4 py-2 text-sm text-purple-700 hover:bg-purple-100 disabled:opacity-50">
            {pending ? "…" : "Promover a Admin"}
          </button>
        ) : (
          <button onClick={() => handleRoleChange("USER")} disabled={pending}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {pending ? "…" : "Degradar a Usuario"}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export function AjustesTab({ mode, targetId, targetUsername, targetActive, targetRole, pushSubs }: Props) {
  if (mode === "other") return null

  return (
    <div className="space-y-8 max-w-lg">
      {mode === "self" && (
        <>
          <ChangePasswordForm />
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Sesión</h3>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
          {pushSubs && pushSubs.length > 0 && (
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Dispositivos con push activo ({pushSubs.length})</h3>
              {pushSubs.map((s) => (
                <PushSubRow key={s.id} sub={s} />
              ))}
            </div>
          )}
        </>
      )}

      {mode === "admin" && (
        <AdminActions
          targetId={targetId}
          targetUsername={targetUsername}
          targetActive={targetActive}
          targetRole={targetRole}
        />
      )}
    </div>
  )
}

function PushSubRow({ sub }: { sub: PushSub }) {
  const [revoked, setRevoked] = useState(false)
  const [pending, start] = useTransition()

  if (revoked) return null

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
      <span className="text-slate-500 truncate max-w-[260px] font-mono text-xs">{sub.endpoint.slice(0, 50)}…</span>
      <button
        onClick={() => start(async () => {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          setRevoked(true)
        })}
        disabled={pending}
        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0 ml-2"
      >
        {pending ? "…" : "Revocar"}
      </button>
    </div>
  )
}
