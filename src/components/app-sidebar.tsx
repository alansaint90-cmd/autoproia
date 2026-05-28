"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
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

const aiStatus = {
  label: "Ativo",
  dot: "bg-success",
  description: "18 conversas em atendimento automatico."
};

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[18px_0_60px_rgba(0,0,0,0.22)] md:flex">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <BrandLogo size={52} showStatus />
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
                active ? "bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(250,204,21,0.18)]" : "text-muted-foreground hover:bg-white/[0.045] hover:text-foreground"
              )}
            >
              {active ? <span className="absolute left-0 h-6 w-[3px] rounded-r bg-primary-foreground/75" /> : null}
              <Icon className="size-[18px]" />
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
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span className="flex items-center gap-2">
            <Bot className="size-3.5 text-primary" />
              Status da IA
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[10px] font-bold">
              <span className={cn("size-2 rounded-full", aiStatus.dot)} />
              {aiStatus.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{aiStatus.description}</p>
        </div>
      </div>
    </aside>
  );
}
