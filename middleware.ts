import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;

  const isAuthRoute   = nextUrl.pathname.startsWith("/auth");
  const isApiRoute    = nextUrl.pathname.startsWith("/api");
  const isCronRoute   = nextUrl.pathname.startsWith("/api/cron");
  const isPublicRoute = nextUrl.pathname === "/";

  // Cron routes are protected by CRON_SECRET header — skip auth check
  if (isCronRoute) return NextResponse.next();

  // Let API routes handle their own auth
  if (isApiRoute) return NextResponse.next();

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect unauthenticated users to login
  if (!isPublicRoute && !isAuthRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
