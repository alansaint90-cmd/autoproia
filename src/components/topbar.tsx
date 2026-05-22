import { Bell, Plus, Search } from "lucide-react";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="text-lg font-bold leading-none">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>

      <div className="ml-6 hidden max-w-md flex-1 lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar leads, conversas, clientes..."
            className="h-9 w-full rounded-lg border border-border bg-input/40 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" />
          Novo Lead
        </button>
        <button className="relative grid size-9 place-items-center rounded-lg border border-border hover:bg-accent">
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" />
        </button>
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          AP
        </div>
      </div>
    </header>
  );
}
