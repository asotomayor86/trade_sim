"use client"

interface Props {
  href: string
  label?: string
  title?: string
  className?: string
}

export function DownloadButton({ href, label = "↓", title, className }: Props) {
  const handleClick = () => {
    const a = document.createElement("a")
    a.href = href
    a.click()
  }
  return (
    <button onClick={handleClick} title={title}
      className={className ?? "text-xs text-slate-400 hover:text-blue-500"}>
      {label}
    </button>
  )
}
