import { Link } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";

export function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState icon={MapPinOff} title="Página não encontrada">
        <Link to="/" className="font-semibold text-pitch-700 hover:underline">Voltar ao início</Link>
      </EmptyState>
    </div>
  );
}
