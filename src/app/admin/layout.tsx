import { requireAdmin } from "@/lib/auth/session"
import { Sidebar } from "@/components/layout/Sidebar"
import { UserMenu } from "@/components/layout/UserMenu"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const { name, role } = session.user

  return (
    <div className="flex h-full">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <span className="text-sm font-medium text-slate-500">Panel de administración</span>
          <UserMenu username={name ?? "admin"} role={role} />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
