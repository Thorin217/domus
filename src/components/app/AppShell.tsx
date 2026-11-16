"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHogar } from "@/lib/hogar/useHogar";
import { useSincronizarPush } from "@/lib/avisos/push-client";
import type { Hogar, Integrante } from "@/lib/hogar/types";
import { Logo } from "@/components/Logo";
import { AvatarGroup } from "@/components/ui/Avatar";
import {
  CalendarIcon,
  CartIcon,
  ChecklistIcon,
  CloseIcon,
  GiftIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  UsersIcon,
} from "@/components/Icons";
import ui from "@/components/ui/ui.module.css";
import styles from "./shell.module.css";

type HogarCtx = {
  hogar: Hogar;
  integrantes: Integrante[];
  yo: Integrante;
  esAdmin: boolean;
};

const HogarContext = createContext<HogarCtx | null>(null);

export function useHogarActual() {
  const ctx = useContext(HogarContext);
  if (!ctx) throw new Error("useHogarActual debe usarse dentro de <AppShell>");
  return ctx;
}

const NAV = [
  { href: "/inicio", label: "Resumen", Icon: GridIcon },
  { href: "/compras", label: "Compras y gastos", Icon: CartIcon },
  { href: "/gastos-fijos", label: "Gastos fijos", Icon: CalendarIcon },
  { href: "/quehaceres", label: "Quehaceres", Icon: ChecklistIcon },
  { href: "/premios", label: "Premios y castigos", Icon: GiftIcon },
  { href: "/familia", label: "Familia", Icon: UsersIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, perfil, cargando: cargandoAuth, salir } = useAuth();
  const { hogar, integrantes, cargando: cargandoHogar, error } = useHogar(perfil?.hogarId);
  const [menuAbierto, setMenuAbierto] = useState(false);
  useSincronizarPush(user?.uid ?? null);

  // Sin sesión → login. Sin hogar → bienvenida.
  useEffect(() => {
    if (cargandoAuth) return;
    if (!user) router.replace("/login");
    else if (!perfil?.hogarId) router.replace("/bienvenida");
  }, [user, perfil, cargandoAuth, router]);

  useEffect(() => {
    if (!menuAbierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuAbierto(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuAbierto]);

  const yo = integrantes.find((i) => i.uid === user?.uid);

  if (cargandoAuth || !user || !perfil?.hogarId || cargandoHogar || (!error && (!hogar || !yo))) {
    return (
      <div className={ui.pantallaCarga}>
        <span className={ui.spinner} aria-label="Cargando tu hogar" />
      </div>
    );
  }

  if (error || !hogar || !yo) {
    return (
      <div className={ui.pantallaCarga} style={{ flexDirection: "column", gap: 16, padding: 24, textAlign: "center" }}>
        <p className={`${ui.alerta} ${ui.alertaError}`}>{error ?? "No encontramos tu hogar."}</p>
        <button className={`${ui.btn} ${ui.secundario}`} onClick={() => salir()}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  const ctx: HogarCtx = { hogar, integrantes, yo, esAdmin: yo.rol === "admin" };

  const nav = (
    <nav className={styles.nav} aria-label="Principal">
      {NAV.map((item) => {
        const activo = pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={styles.navItem}
            data-activo={activo}
            aria-current={activo ? "page" : undefined}
            onClick={() => setMenuAbierto(false)}
          >
            <item.Icon size={20} className={styles.navIcon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const tarjetaHogar = (
    <div className={styles.hogarCard}>
      <span className={styles.hogarNombre}>{hogar.nombre}</span>
      <AvatarGroup personas={integrantes.slice(0, 6)} borde="var(--surface)" />
      <span className={styles.hogarMeta}>
        {integrantes.length} {integrantes.length === 1 ? "integrante" : "integrantes"}
      </span>
      <button type="button" className={styles.salir} onClick={() => salir()}>
        <LogoutIcon size={20} />
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <HogarContext.Provider value={ctx}>
      <div className={styles.shell}>
        {/* Barra superior (móvil / tablet) */}
        <header className={styles.topbar}>
          <Link href="/inicio" aria-label="Domus, resumen" className={styles.topLogo} onClick={() => setMenuAbierto(false)}>
            <Logo width={116} />
          </Link>
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={menuAbierto}
            aria-controls="menu-app"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuAbierto((v) => !v)}
          >
            {menuAbierto ? <CloseIcon size={26} /> : <MenuIcon size={26} />}
          </button>
        </header>

        <div id="menu-app" className={styles.drawer} hidden={!menuAbierto}>
          {nav}
          {tarjetaHogar}
        </div>

        {/* Menú lateral (escritorio) */}
        <aside className={styles.sidebar}>
          <Link href="/inicio" aria-label="Domus, resumen" className={styles.sideLogo}>
            <Logo width={130} />
          </Link>
          {nav}
          {tarjetaHogar}
        </aside>

        <main className={styles.main}>{children}</main>
      </div>
    </HogarContext.Provider>
  );
}
