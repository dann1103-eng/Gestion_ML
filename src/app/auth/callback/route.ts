import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/movimientos";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Sincronizar/crear usuario en tabla local — defensivo si el trigger falla.
      await prisma.usuario.upsert({
        where: { id: data.user.id },
        create: {
          id: data.user.id,
          email: data.user.email ?? `user-${data.user.id}@unknown`,
          nombre:
            data.user.user_metadata?.nombre ??
            data.user.email?.split("@")[0] ??
            "Sin nombre",
        },
        update: {},
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
