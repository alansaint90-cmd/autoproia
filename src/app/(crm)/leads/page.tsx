import { leads } from "@/lib/mock-data";
import { Topbar } from "@/components/topbar";

export default function LeadsPage() {
  return (
    <>
      <Topbar title="Leads" subtitle="Base comercial filtravel para atendimento e matriculas" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Lead</th>
                <th className="p-3 font-medium">Telefone</th>
                <th className="p-3 font-medium">Origem</th>
                <th className="p-3 font-medium">Etapa</th>
                <th className="p-3 font-medium">Responsavel</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={lead.avatar} alt="" className="size-8 rounded-full" />
                      <span className="font-medium">{lead.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{lead.phone}</td>
                  <td className="p-3 text-muted-foreground">{lead.origin}</td>
                  <td className="p-3 capitalize">{lead.stage}</td>
                  <td className="p-3 text-muted-foreground">{lead.responsible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
