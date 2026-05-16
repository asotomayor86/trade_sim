import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.role === "ADMIN"

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.url))
    if (!isAdmin) return NextResponse.redirect(new URL("/app/dashboard", req.url))
    return NextResponse.next()
  }

  if (pathname.startsWith("/app")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.url))
    return NextResponse.next()
  }

  if ((pathname === "/login" || pathname === "/register") && isLoggedIn) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url))
  }
})

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/login", "/register"],
}
