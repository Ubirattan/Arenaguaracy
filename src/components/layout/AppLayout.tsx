import clsx from "clsx";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABEL, initials } from "@/lib/format";
import { Brand } from "@/components/ui/Logo";
import { navFor } from "./navigation";

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  if (!profile) return null;

  const items = navFor(profile.role);
  const mobileItems = items.filter((i) => i.mobile).slice(0, 4);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    clsx(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
      isActive ? "bg-pitch-600 text-white shadow-sm" : "text-navy-100 hover:bg-navy-800 hover:text-white",
    );

  const SidebarContent = (
    <>
      <div className="px-5 py-5"><Brand /></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Menu principal">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"} className={linkCls} onClick={() => setDrawer(false)}>
            <i.icon className="h-5 w-5 shrink-0" /> {i.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-navy-800 p-3">
        <div className="mb-2 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pitch-600 text-sm font-bold text-white">
            {initials(profile.full_name || profile.email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{profile.full_name || profile.email}</p>
            <p className="text-xs text-navy-200">{ROLE_LABEL[profile.role]}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-100 hover:bg-navy-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Menu lateral — computador */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 lg:flex">{SidebarContent}</aside>

      {/* Menu deslizante — celular/tablet */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy-900 pt-safe pb-safe">
            <button
              onClick={() => setDrawer(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 rounded-lg p-2 text-navy-100 hover:bg-navy-800"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Cabeçalho — celular */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-navy-900 px-4 py-3 pt-safe lg:hidden">
        <Brand />
        <button onClick={() => setDrawer(true)} aria-label="Abrir menu" className="rounded-lg p-2 text-white hover:bg-navy-800">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <main key={location.pathname} className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
        <Outlet />
      </main>

      {/* Barra inferior — celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white pb-safe lg:hidden"
        style={{ gridTemplateColumns: `repeat(${mobileItems.length + 1}, minmax(0, 1fr))` }}
        aria-label="Navegação rápida"
      >
        {mobileItems.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === "/"}
            className={({ isActive }) =>
              clsx("flex flex-col items-center gap-1 py-2 text-[11px] font-medium", isActive ? "text-pitch-600" : "text-slate-500")
            }
          >
            <i.icon className="h-5 w-5" /> <span className="max-w-full truncate px-1">{i.short ?? i.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-slate-500">
          <Menu className="h-5 w-5" /> Mais
        </button>
      </nav>
    </div>
  );
}
