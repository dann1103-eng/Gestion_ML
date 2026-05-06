"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  UserRound,
  Landmark,
  Receipt,
  FileText,
  CalendarCheck,
  GitMerge,
  Tag,
  Layers,
  Handshake,
  CalendarClock,
  BookOpen,
  TrendingUp,
  Wallet,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { href: "/",                          label: "Dashboard",      icon: LayoutDashboard, exact: true },
  { href: "/movimientos",               label: "Movimientos",    icon: ArrowLeftRight                },
  { href: "/donantes",                  label: "Donantes",       icon: Users                         },
  { href: "/empleados",                 label: "Empleados",      icon: UserRound                     },
  { href: "/cuentas",                   label: "Cuentas",        icon: Landmark                      },
  { href: "/planillas",                 label: "Planillas",      icon: Receipt                       },
  { href: "/resumen",                   label: "Resumen",        icon: TrendingUp                    },
  { href: "/presupuestos",              label: "Presupuestos",   icon: Wallet                        },
  { href: "/reportes",                  label: "Reportes",       icon: FileText                      },
  { href: "/cierre",                    label: "Cierre de mes",  icon: CalendarCheck                 },
  { href: "/control",                   label: "Control",        icon: ListChecks                    },
  { href: "/conciliacion",              label: "Conciliación",   icon: GitMerge                      },
  { href: "/catalogos/conceptos",       label: "Conceptos",      icon: Tag                           },
  { href: "/catalogos/clasificaciones", label: "Clasificaciones",icon: Layers                        },
];

const NAV_FE = [
  { href: "/convenios",   label: "Convenios",   icon: Handshake    },
  { href: "/sesiones",    label: "Sesiones",    icon: CalendarClock },
  { href: "/conferencias",label: "Conferencias",icon: BookOpen      },
];

function NavItem({ href, label, icon: Icon, exact }: { href: string; label: string; icon: React.ElementType; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
        "transition-all duration-150 ease-in-out",
        active
          ? "bg-sidebar-surface text-sidebar-text border-l-2 border-sidebar-accent rounded-l-none pl-[10px]"
          : "text-sidebar-muted hover:text-sidebar-text hover:bg-white/5",
      )}
    >
      <Icon
        size={15}
        strokeWidth={active ? 2.2 : 1.8}
        className={cn(
          "shrink-0 transition-colors duration-150",
          active ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-text",
        )}
      />
      <span>{label}</span>
    </Link>
  );
}

export function NavLinks() {
  return (
    <nav className="flex flex-col gap-4">
      {/* Navegación principal */}
      <div className="space-y-0.5">
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Grupo Formación Empresarial */}
      <div className="rounded-lg border border-sidebar-accent/20 bg-sidebar-accent/5 px-2 py-2.5">
        <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-accent/70">
          Formación Empresarial
        </p>
        <div className="space-y-0.5">
          {NAV_FE.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}
