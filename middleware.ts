import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { legacyCohortPathRedirect } from "@/lib/cohort-routes"

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"])

export default clerkMiddleware(
  async (auth, request) => {
    const legacyRedirect = legacyCohortPathRedirect(
      request.nextUrl.pathname,
      request.nextUrl.search,
    )
    if (legacyRedirect) {
      return NextResponse.redirect(new URL(legacyRedirect, request.url))
    }

    if (!isPublicRoute(request)) {
      await auth.protect()
    }
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  },
)

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
