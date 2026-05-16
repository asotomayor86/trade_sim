"use client"

import { useTransition } from "react"
import { removeTicker } from "@/actions/tickers"

export function TickerActions({ symbol, active }: { symbol: string; active: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => removeTicker(symbol))}
      className={`text-xs font-medium disabled:opacity-50 ${
        active ? "text-red-600 hover:text-red-500" : "text-green-600 hover:text-green-500"
      }`}
    >
      {active ? "Desactivar" : "Reactivar"}
    </button>
  )
}
