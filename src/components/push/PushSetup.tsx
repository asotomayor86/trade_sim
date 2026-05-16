"use client"

import { useEffect } from "react"

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

export function PushSetup({ publicKey }: { publicKey: string }) {
  useEffect(() => {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const existing = await reg.pushManager.getSubscription()
        if (existing) return

        const sub = await reg.pushManager
          .subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
          .catch(() => null)

        if (!sub) return

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        })
      })
      .catch(() => {})
  }, [publicKey])

  return null
}
