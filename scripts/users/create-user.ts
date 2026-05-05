/**
 * Crea un usuario en Supabase Auth con email + password.
 * Email queda confirmado automáticamente (no requiere clic en enlace).
 *
 * Uso:
 *   pnpm create-user <email> <password>
 *
 * Ejemplo:
 *   pnpm create-user admin@elmolino.org SuPasswordSegura123
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error("Uso: pnpm create-user <email> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verificar si el usuario ya existe
  const { data: existingPage } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = existingPage?.users.find((u) => u.email === email);

  if (existing) {
    console.log(`Usuario ${email} ya existe. Actualizando contraseña...`);
    const { error: updError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updError) {
      console.error("Error actualizando contraseña:", updError.message);
      process.exit(1);
    }
    console.log(`✓ Contraseña actualizada para ${email}`);
    return;
  }

  // Crear nuevo
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("Error creando usuario:", error.message);
    process.exit(1);
  }

  console.log(`✓ Usuario creado: ${email}`);
  console.log(`  ID: ${data.user.id}`);
  console.log(`  Puede iniciar sesión inmediatamente con su contraseña.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
