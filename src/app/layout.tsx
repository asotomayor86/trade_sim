import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })

export const metadata: Metadata = {
  title: "trade_sim",
  description: "Plataforma de trading educativo",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 font-sans antialiased">{children}</body>
    </html>
  )
}
