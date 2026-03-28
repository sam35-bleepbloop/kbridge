import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    newUser: "/dashboard",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(8) })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.image) return null; // image field reused for hashed password
        // NOTE: In production use a separate passwordHash field — added in next migration

        const valid = await compare(parsed.data.password, user.image);
        if (!valid) return null;

        // FIX: displayName is String? — coerce null to undefined for NextAuth type compat
        return { id: user.id, email: user.email!, name: user.displayName ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id ?? "";

        // On first sign-in, check if this email belongs to an active employee.
        // Store the result in the JWT so we only hit the DB once per session.
        if (user.email) {
          const employee = await db.employee.findUnique({
            where: { email: user.email },
            select: { isActive: true, role: true },
          });
          token.isEmployee = !!(employee?.isActive);
          token.employeeRole = employee?.role ?? null;
        }
      }

      // Persist Google access token for Calendar API calls
      if (account?.provider === "google") {
        token.googleAccessToken  = account.access_token;
        token.googleRefreshToken = account.refresh_token;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id                = token.id as string;
        session.user.isEmployee        = token.isEmployee as boolean ?? false;
        session.user.employeeRole      = token.employeeRole as string | null ?? null;
        session.user.googleAccessToken = token.googleAccessToken as string | undefined;
      }
      return session;
    },
  },
  events: {
    // Award welcome bonus tokens on first sign-up (credentials only —
    // createUser only fires for OAuth; credentials signup handles bonus manually)
    async createUser({ user }) {
      const bonusAmount = 5;
      await db.tokenLedger.create({
        data: {
          userId:       user.id!,
          txType:       "BONUS",
          amount:       bonusAmount,
          balanceAfter: bonusAmount,
          description:  "Welcome bonus — 5 tokens on us",
        },
      });
      // tokenBalance is already set to 5 via schema default (v4.0)
    },
  },
});