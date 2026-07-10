import { NextResponse, type NextRequest } from "next/server";

// Rýchla kontrola prítomnosti session cookie — skutočné overenie robí
// requireUser() v (app)/layout.tsx a v server actions.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("zs_session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Všetko okrem loginu, externých API a statických súborov
    "/((?!login|api/inbox|api/konkurencia|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
