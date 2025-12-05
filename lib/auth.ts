import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import EmailProvider from "next-auth/providers/email"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

// Auth providers
const providers: NextAuthOptions["providers"] = [
  EmailProvider({
    server: process.env.EMAIL_SERVER,
    from: process.env.EMAIL_FROM,
  }),
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      })

      if (!user || !(user as any).password) {
        return null
      }

      const isValid = await bcrypt.compare(credentials.password, (user as any).password)
      if (!isValid) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    },
  }),
]

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // Add user ID to JWT token on initial sign in
      if (user) {
        token.id = user.id
      }
      return token
    },
    session: async ({ session, token }) => {
      // Add user ID from JWT token to session
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}


