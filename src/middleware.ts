import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresca sesión, setea cookies si es necesario.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.pathname;
  const isAuthRoute = url.startsWith("/login") || url.startsWith("/auth");
  const isPublic = url.startsWith("/_next") || url.startsWith("/favicon");

  if (!user && !isAuthRoute && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
