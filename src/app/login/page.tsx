import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">trade_sim</h1>
          <p className="mt-1 text-sm text-slate-500">Inicia sesión en tu cuenta</p>
        </div>

        <LoginForm searchParams={searchParams} />

        <p className="text-center text-sm text-slate-500">
          ¿Tienes un código de invitación?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
