"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  KanbanSquare,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/conversas", label: "Conversas", icon: MessageSquareText, badge: 4 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/relatorios", label: "Relatorios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,#060b13,#0b1120)] text-sidebar-foreground shadow-[18px_0_60px_rgba(0,0,0,0.22)] md:flex">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <BrandLogo size={36} />
          <div>
            <div className="text-sm font-black tracking-wide">
              <span className="text-slate-50">AUTO </span>
              <span className="text-primary">PRO</span>
              <span className="text-slate-50"> IA</span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">v1.1 CRM</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "ap-button-primary" : "text-muted-foreground hover:bg-white/[0.045] hover:text-foreground"
              )}
            >
              {active ? <span className="absolute left-0 h-6 w-[3px] rounded-r bg-primary-foreground/75" /> : null}
              <Icon className={cn("size-[18px] transition-colors", active ? "text-primary-foreground" : "text-primary/85")} />
              <span className="flex-1 font-medium">{item.label}</span>
              {item.badge ? (
                <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
