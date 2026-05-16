"use client"

import { useState } from "react"

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-xs text-blue-600 hover:text-blue-500"
    >
      {copied ? "¡Copiado!" : "Copiar link"}
    </button>
  )
}
