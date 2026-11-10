import type { UserRole } from "@/types/database";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  professor: "Professor",
  responsavel: "Responsável",
};

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatCurrency = (v: number | null | undefined) => brl.format(Number(v ?? 0));

/** Formata 'YYYY-MM-DD' sem deslocamento de fuso */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function ageFromBirth(birth: string, ref = new Date()) {
  const [y, m, d] = birth.split("-").map(Number);
  let age = ref.getFullYear() - y;
  if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) age--;
  return age;
}

export function formatPhone(v: string | null | undefined) {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v ?? "";
}

export function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}
