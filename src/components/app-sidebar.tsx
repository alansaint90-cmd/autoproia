"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Car,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
            <Car size={21} strokeWidth={2.5} />
            <span className="absolute -right-1 -top-1 size-3 rounded-full bg-success ring-2 ring-sidebar" />
          </div>
          <div>
            <div className="text-sm font-bold">AUTO PRO IA</div>
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
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent"
              )}
            >
              {active ? <span className="absolute left-0 h-6 w-[3px] rounded-r bg-primary" /> : null}
              <Icon className={cn("size-[18px]", active && "text-primary")} />
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

      <div className="space-y-3 border-t border-sidebar-border p-3">
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Bot className="size-3.5 text-primary" />
            IA Ativa
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">18 conversas em atendimento automatico.</p>
        </div>
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent">
          <LogOut className="size-4" />
          Sair
        </Link>
      </div>
    </aside>
  );
}
