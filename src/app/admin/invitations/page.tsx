import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { type InvitationCode } from "@prisma/client"
import { CreateInvitationButton } from "@/components/admin/CreateInvitationButton"
import { CopyLinkButton } from "@/components/admin/CopyLinkButton"

export default async function InvitationsPage() {
  await requireAdmin()

  const codes = await prisma.invitationCode.findMany({
    orderBy: { createdAt: "desc" },
  })

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Invitaciones</h1>
        <CreateInvitationButton />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Código / Link</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Nota</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(codes as InvitationCode[]).map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-3">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800">
                    {inv.code}
                  </code>
                  {!inv.usedAt && (
                    <CopyLinkButton url={`${baseUrl}/register?code=${inv.code}`} />
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{inv.note ?? "—"}</td>
                <td className="px-4 py-3">
                  {inv.usedAt ? (
                    <span className="text-xs text-slate-400">
                      Usado por <strong>{inv.usedBy}</strong>
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Disponible
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(inv.createdAt).toLocaleDateString("es-ES")}
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No hay códigos todavía. Crea uno con el botón de arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
