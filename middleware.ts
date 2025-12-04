import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

/**
 * Middleware for authentication and dev auto-login
 * 
 * In development with DEV_AUTO_LOGIN set:
 * - Automatically logs in the specified user on first request
 * - Skips auto-login for API routes, static files, and auth pages
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes (except auto-login check), and auth pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Dev auto-login: If DEV_AUTO_LOGIN is set and user is not logged in
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTO_LOGIN) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    // If not logged in, redirect to auto-login
    if (!token) {
      const autoLoginUrl = new URL("/api/dev/auto-login", request.url)
      autoLoginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(autoLoginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

