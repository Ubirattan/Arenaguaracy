import {
  BarChart3, Bell, CalendarDays, ClipboardCheck, CreditCard, GraduationCap, Home, Settings,
  ShieldCheck, UserCircle, Users, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/database";

export interface NavItem {
  to: string;
  label: string;
  /** rótulo curto para a barra inferior do celular */
  short?: string;
  icon: LucideIcon;
  roles: UserRole[];
  /** aparece na barra inferior do celular */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Início", icon: Home, roles: ["admin", "professor", "responsavel"], mobile: true },
  { to: "/atletas", label: "Atletas", icon: Users, roles: ["admin", "professor"], mobile: true },
  { to: "/meus-atletas", label: "Meus atletas", icon: Users, roles: ["responsavel"], mobile: true },
  { to: "/responsaveis", label: "Responsáveis", icon: UsersRound, roles: ["admin"] },
  { to: "/professores", label: "Professores", icon: GraduationCap, roles: ["admin"] },
  { to: "/turmas", label: "Turmas e horários", short: "Turmas", icon: CalendarDays, roles: ["admin", "professor", "responsavel"], mobile: true },
  { to: "/presenca", label: "Presença", icon: ClipboardCheck, roles: ["admin", "professor"], mobile: true },
  { to: "/frequencia", label: "Frequência", icon: ClipboardCheck, roles: ["responsavel"] },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, roles: ["admin"], mobile: true },
  { to: "/mensalidades", label: "Mensalidades", short: "Mensal.", icon: CreditCard, roles: ["responsavel"], mobile: true },
  { to: "/comunicados", label: "Comunicados", short: "Avisos", icon: Bell, roles: ["admin", "professor", "responsavel"], mobile: true },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin"] },
  { to: "/usuarios", label: "Usuários e acessos", icon: ShieldCheck, roles: ["admin"] },
  { to: "/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
  { to: "/perfil", label: "Meu perfil", icon: UserCircle, roles: ["admin", "professor", "responsavel"] },
];

export const navFor = (role: UserRole) => NAV_ITEMS.filter((i) => i.roles.includes(role));
