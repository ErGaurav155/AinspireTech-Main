import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Redirect dashboard paths to app subdomain
  const dashboardPaths = [
    "/dashboard",
    "/admin",
    "/web/UserDashboard",
    "/insta/accounts",
  ];

  if (dashboardPaths.some((path) => url.pathname.startsWith(path))) {
    url.hostname = "app.ainspiretech.com";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
