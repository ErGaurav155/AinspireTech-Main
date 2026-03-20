import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/chatbotembed.js",
  "/mcqchatbotembed.js",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // ✅ DO NOT return
  }
});

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
