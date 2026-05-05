import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { prisma } from "./prisma";

export type SessionUser = {
  id: string;
  email: string;
  nombre: string;
};

/**
 * Devuelve el usuario autenticado o null. NO redirige.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Asegurarse de que existe en tabla Usuario (idempotente).
  const dbUser = await prisma.usuario.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? `user-${user.id}@unknown`,
      nombre: user.user_metadata?.nombre ?? user.email?.split("@")[0] ?? "Sin nombre",
    },
    update: {},
  });

  return {
    id: dbUser.id,
    email: dbUser.email,
    nombre: dbUser.nombre,
  };
}

/**
 * Devuelve el usuario autenticado o redirige al login.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
