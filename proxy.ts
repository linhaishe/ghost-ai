import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

function pathnameFromUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value).pathname;
  }

  return value;
}

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up";

const isPublicRoute = createRouteMatcher([
  `${pathnameFromUrl(signInUrl)}(.*)`,
  `${pathnameFromUrl(signUpUrl)}(.*)`,
  "/api/projects(.*)",
]);

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  },
  {
    signInUrl,
    signUpUrl,
  },
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json)$).*)",
    "/(api|trpc)(.*)",
  ],
};
