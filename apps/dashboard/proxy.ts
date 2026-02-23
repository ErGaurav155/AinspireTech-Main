import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/web/pricing",
  "/insta/pricing",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/chatbotembed.js",
  "/mcqchatbotembed.js",
  "/chromium-pack.tar",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // ✅ DO NOT return
  }
});

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
