import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { encode } from "next-auth/jwt"
import { prisma } from "@/lib/db"

/**
 * Dev-only: Auto-login API endpoint
 * 
 * Creates a session for the user specified in DEV_AUTO_LOGIN env var
 * Only works in development mode
 */
export async function GET(request: NextRequest) {
  // Security: Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    )
  }

  const email = process.env.DEV_AUTO_LOGIN
  if (!email) {
    return NextResponse.json(
      { error: "DEV_AUTO_LOGIN not set" },
      { status: 400 }
    )
  }

  // Check if already logged in
  const session = await getServerSession(authOptions)
  if (session?.user?.email === email) {
    // Already logged in as this user, redirect to home
    const redirectUrl = request.nextUrl.searchParams.get("callbackUrl") || "/"
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return NextResponse.json(
      { error: `User not found: ${email}` },
      { status: 404 }
    )
  }

  // Create JWT token
  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      sub: user.id,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })

  // Set cookie and redirect
  const redirectUrl = request.nextUrl.searchParams.get("callbackUrl") || "/"
  const response = NextResponse.redirect(new URL(redirectUrl, request.url))
  
  // Set the session cookie (dev-only, so never secure)
  response.cookies.set("next-auth.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })

  return response
}

