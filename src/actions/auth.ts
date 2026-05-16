"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/app/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return "Usuario o contraseña incorrectos"
    }
    throw error
  }
  return null
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
