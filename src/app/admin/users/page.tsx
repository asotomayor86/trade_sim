import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { type Role } from "@prisma/client"
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm"
import { ToggleUserActiveButton } from "@/components/admin/ToggleUserActiveButton"

type UserRow = { id: string; username: string; role: Role; active: boolean; createdAt: Date }

export default async function UsersPage() {
  await requireAdmin()

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, active: true, createdAt: true },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Registro</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users as UserRow[]).map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{user.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      user.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {user.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString("es-ES")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ResetPasswordForm userId={user.id} />
                    <ToggleUserActiveButton userId={user.id} active={user.active} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
