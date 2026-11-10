import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/Feedback";

/** Página provisória para módulos das próximas etapas (rota e permissões já configuradas). */
export function ComingSoonPage({ title, stage, description }: { title: string; stage: number; description: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="card">
        <EmptyState icon={Construction} title={`Módulo previsto para a etapa ${stage}`}>
          {description} A estrutura do banco de dados e as regras de acesso deste módulo já estão prontas.
        </EmptyState>
      </div>
    </>
  );
}
