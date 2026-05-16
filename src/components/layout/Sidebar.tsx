import Link from "next/link"
import { type Role } from "@prisma/client"

const navItems = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/chart", label: "Gráficos" },
  { href: "/app/analyses", label: "Análisis" },
  { href: "/app/operations", label: "Operaciones" },
  { href: "/app/alerts", label: "Alertas" },
  { href: "/app/ranking", label: "Ranking" },
  { href: "/app/users", label: "Usuarios" },
]

const adminItems = [
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/invitations", label: "Invitaciones" },
  { href: "/admin/tickers", label: "Tickers" },
  { href: "/admin/audit-log", label: "Audit Log" },
]

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="flex h-full w-56 flex-col bg-slate-900 px-3 py-6">
      <div className="mb-8 px-3">
        <span className="text-lg font-bold text-white">trade_sim</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}

        {role === "ADMIN" && (
          <>
            <div className="my-3 border-t border-slate-700" />
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Admin
            </p>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
