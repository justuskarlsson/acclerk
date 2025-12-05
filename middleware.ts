import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Routes that don't require authentication
const publicRoutes = ["/login", "/register", "/api/auth"]

/**
 * Middleware for authentication
 * 
 * Protects routes by redirecting unauthenticated users to /login.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Allow public routes without auth
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check authentication using JWT token from cookie
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // If not logged in, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

