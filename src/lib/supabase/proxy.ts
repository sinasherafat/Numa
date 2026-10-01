import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, hasSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseConfig()) return NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    db: { schema: "numa" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headersToSet ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isPrivatePage = request.nextUrl.pathname.startsWith("/workspace");
  if (!data?.claims && isPrivatePage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}
