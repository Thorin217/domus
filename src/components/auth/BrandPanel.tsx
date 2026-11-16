import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CheckIcon } from "@/components/Icons";
import styles from "./auth.module.css";

const PUNTOS = [
  "Compras, gastos fijos y presupuesto del mes",
  "Horario de quehaceres para cada integrante",
  "Premios y castigos calificados por la familia",
];

/** Panel imperial-blue de marca (Login / Bienvenida). En móvil se compacta a una franja. */
export function BrandPanel({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className={styles.brand}>
      <Link href="/" aria-label="Domus, volver al inicio" className={styles.brandLogo}>
        <Logo variant="dark" width={140} />
      </Link>
      <div className={styles.brandCopy}>
        <h1 className={styles.brandTitle}>{titulo}</h1>
        {texto && <p className={styles.brandText}>{texto}</p>}
        <ul className={styles.brandLista}>
          {PUNTOS.map((p) => (
            <li key={p}>
              <span className={styles.brandCheck} aria-hidden="true">
                <CheckIcon size={14} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <span className={styles.brandPie}>Domus · gestión del hogar</span>
    </div>
  );
}
