import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { verifyPassword } from "@/lib/auth/passwords"

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username },
        })

        if (!user || !user.active) return null

        const valid = await verifyPassword(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, name: user.username, role: user.role } as const
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as import("@prisma/client").Role
      return session
    },
  },
})
