import Link from "next/link"
import { type Role } from "@prisma/client"

const navItems = [
  { href: "/app/dashboard", label: "DASHBOARD" },
  { href: "/app/chart", label: "GRÁFICOS" },
  { href: "/app/operations", label: "OPERACIONES" },
  { href: "/app/orders", label: "ÓRDENES" },
  { href: "/app/alerts", label: "ALERTAS" },
  { href: "/app/ranking", label: "RANKING" },
  { href: "/app/users", label: "USUARIOS" },
]

const playbookItems = [
  { href: "/app/analyses", label: "ANÁLISIS" },
  { href: "/app/playbook/strategies", label: "ESTRATEGIAS" },
]

const adminItems = [
  { href: "/admin/users", label: "USUARIOS" },
  { href: "/admin/invitations", label: "INVITACIONES" },
  { href: "/admin/tickers", label: "TICKERS" },
  { href: "/admin/audit-log", label: "AUDIT LOG" },
]

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="flex h-full w-56 flex-col bg-slate-900 px-3 py-6">
      <div className="mb-8 px-3">
        <span className="text-lg font-bold text-white">trade_sim</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
            {item.label}
          </Link>
        ))}

        {/* Playbook section */}
        <div className="mt-3">
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Playbook
          </p>
          {playbookItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-md px-3 py-2 pl-5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex">
              {item.label}
            </Link>
          ))}
        </div>

        {role === "ADMIN" && (
          <>
            <div className="my-3 border-t border-slate-700" />
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Admin
            </p>
            {adminItems.map((item) => (
              <Link key={item.href} href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
