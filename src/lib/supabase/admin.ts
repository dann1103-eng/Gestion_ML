import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role key. Solo se debe usar desde Server Actions/Routes.
 * Bypassea RLS — manejar con cuidado.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
