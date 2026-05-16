import { RegisterForm } from "@/components/auth/RegisterForm"
import Link from "next/link"

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">trade_sim</h1>
          <p className="mt-1 text-sm text-slate-500">Crear cuenta con código de invitación</p>
        </div>

        <RegisterForm searchParams={searchParams} />

        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
