import { Topbar } from "@/components/topbar";

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <main className="flex-1 p-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Esta area ja esta conectada ao layout principal e pronta para receber os dados reais do PostgreSQL,
            eventos em tempo real do Supabase e acoes com RBAC.
          </p>
        </section>
      </main>
    </>
  );
}
