import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { NavLinks } from "@/components/ui/nav-links";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0">

        {/* Brand */}
        <div className="px-5 py-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-sidebar-accent/15 border border-sidebar-accent/30">
              <Building2 size={16} className="text-sidebar-accent" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sidebar-text font-serif text-base font-semibold leading-tight italic">
                Gestión ML
              </p>
              <p className="text-sidebar-muted text-[10px] leading-tight tracking-wide uppercase font-sans">
                Centro Cultural El Molino
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <NavLinks />
        </div>

        {/* CTA: Nuevo movimiento */}
        <div className="px-4 pb-3">
          <Link
            href="/movimientos/nuevo"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg bg-sidebar-accent text-sidebar font-semibold text-sm hover:brightness-110 transition-all shadow-sm"
          >
            <Plus size={16} strokeWidth={2.2} />
            <span className="tracking-tight">Nuevo movimiento</span>
          </Link>
        </div>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <Link
            href="/perfil"
            className="text-sidebar-muted text-xs truncate mb-2.5 font-sans block hover:text-sidebar-text transition-colors"
            title="Mi perfil"
          >
            {user.email}
          </Link>
          <form action="/auth/signout" method="post">
            <Button
              type="submit"
              size="sm"
              className="w-full text-xs bg-sidebar-surface border border-sidebar-border text-sidebar-muted hover:text-sidebar-text hover:bg-white/5 hover:border-sidebar-accent/40"
              variant="ghost"
            >
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
