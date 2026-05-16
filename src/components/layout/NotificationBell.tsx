"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { markAllNotificationsRead } from "@/actions/alerts"

interface Notif {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const [, start] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data: Notif[]) => setNotifs(data))
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      start(async () => {
        await markAllNotificationsRead()
        setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
      })
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notificaciones"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-700">Notificaciones</h3>
            {notifs.length > 0 && (
              <span className="text-xs text-slate-400">{notifs.length} recientes</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Sin notificaciones.</p>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-50 px-4 py-3 last:border-0 ${
                    !n.read ? "bg-blue-50" : ""
                  }`}
                >
                  {!n.read && (
                    <span className="mb-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleString("es-ES")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
