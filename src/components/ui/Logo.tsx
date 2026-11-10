/**
 * ESPAÇO RESERVADO PARA A LOGOMARCA OFICIAL.
 * Para usar a logo oficial: salve o arquivo em /public/logo.png (ou .svg)
 * e troque OFFICIAL_LOGO para "/logo.png". Ou cadastre a URL em
 * Configurações (campo settings.logo_url) em uma etapa futura.
 */
const OFFICIAL_LOGO: string | null = null;

export function Logo({ size = 40 }: { size?: number }) {
  if (OFFICIAL_LOGO) {
    return <img src={OFFICIAL_LOGO} alt="Arena Guaracy" width={size} height={size} className="object-contain" />;
  }
  return (
    <img src="/favicon.svg" alt="Arena Guaracy (logo provisória)" width={size} height={size} className="rounded-xl" />
  );
}

export function Brand({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={40} />
      <div className="leading-tight">
        <div className={dark ? "text-base font-extrabold tracking-tight text-white" : "text-base font-extrabold tracking-tight text-navy-900"}>
          Arena Guaracy
        </div>
        <div className={dark ? "text-[11px] font-medium uppercase tracking-widest text-pitch-400" : "text-[11px] font-medium uppercase tracking-widest text-pitch-600"}>
          Escola de Futebol
        </div>
      </div>
    </div>
  );
}
