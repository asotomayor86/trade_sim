"use client"

import { useState, useEffect } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    // Detectar iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream
    const standalone = ("standalone" in navigator) && (navigator as unknown as Record<string, boolean>).standalone

    if (ios && !standalone) {
      const key = "ios_install_dismissed"
      if (!localStorage.getItem(key)) setShowIOS(true)
      setIsIOS(true)
    }

    // Android/Chrome: capturar beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      const dismissed = localStorage.getItem("pwa_install_dismissed")
      if (!dismissed) setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === "dismissed") localStorage.setItem("pwa_install_dismissed", "1")
    setPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed", "1")
    localStorage.setItem("ios_install_dismissed", "1")
    setPrompt(null)
    setShowIOS(false)
    setDismissed(true)
  }

  if (dismissed) return null

  // Banner Android
  if (prompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-slate-900 border-t border-slate-700 px-4 py-3 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:rounded-xl sm:border sm:max-w-sm">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <p className="text-sm font-semibold text-white">Instalar trade_sim</p>
            <p className="text-xs text-slate-400">Acceso rápido desde tu pantalla de inicio</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  // Instrucciones iOS
  if (isIOS && showIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 px-4 py-4 shadow-lg">
        <div className="flex items-start justify-between gap-3 max-w-sm mx-auto">
          <div className="text-sm text-slate-300">
            <p className="font-semibold text-white mb-1">Instalar en iPhone / iPad</p>
            <p>Pulsa <span className="inline-block px-1 bg-slate-700 rounded text-xs font-mono">⎙ Compartir</span> y luego <em>Añadir a pantalla de inicio</em>.</p>
          </div>
          <button onClick={handleDismiss} className="text-slate-500 hover:text-white shrink-0">✕</button>
        </div>
      </div>
    )
  }

  return null
}
