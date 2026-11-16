import Link from "next/link";
import { Logo } from "@/components/Logo";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" aria-label="Domus, inicio" className={styles.brand}>
          <Logo width={140} className={styles.logo} />
        </Link>

        <nav className={styles.nav} aria-label="Principal">
          <a href="#funciones" className={styles.navLink}>
            Funciones
          </a>
          <a href="#quehaceres" className={styles.navLink}>
            Quehaceres
          </a>
          <a href="#premios" className={styles.navLink}>
            Premios y castigos
          </a>
        </nav>

        <div className={styles.acciones}>
          <Link href="/login" className={`${styles.btn} ${styles.btnOutline}`}>
            Iniciar sesión
          </Link>
          <Link href="/login?modo=crear" className={`${styles.btn} ${styles.btnPrimary} ${styles.soloEscritorio}`}>
            Crear mi hogar
          </Link>
        </div>
      </div>
    </header>
  );
}
