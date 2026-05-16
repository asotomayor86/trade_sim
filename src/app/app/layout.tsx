import { requireAuth } from "@/lib/auth/session"
import { Sidebar } from "@/components/layout/Sidebar"
import { UserMenu } from "@/components/layout/UserMenu"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { PushSetup } from "@/components/push/PushSetup"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const { name, role } = session.user

  return (
    <div className="flex h-full">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu username={name ?? "usuario"} role={role} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <PushSetup publicKey={process.env.VAPID_PUBLIC_KEY ?? ""} />
    </div>
  )
}
