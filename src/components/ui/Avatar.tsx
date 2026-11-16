import { estiloIntegrante, inicial } from "@/lib/hogar/types";
import styles from "./ui.module.css";

export function Avatar({ nombre, color, size = 44 }: { nombre: string; color: number; size?: number }) {
  return (
    <span
      className={styles.avatar}
      style={{ ...estiloIntegrante(color), width: size, height: size, fontSize: Math.round(size * 0.45) }}
      aria-hidden="true"
    >
      {inicial(nombre)}
    </span>
  );
}

/** Avatares superpuestos con borde del color de fondo. */
export function AvatarGroup({
  personas,
  borde,
  size = 36,
}: {
  personas: { nombre: string; color: number }[];
  borde: string;
  size?: number;
}) {
  return (
    <div className={styles.avatarGroup}>
      {personas.map((p, i) => (
        <span
          key={i}
          className={styles.avatar}
          style={{
            ...estiloIntegrante(p.color),
            width: size,
            height: size,
            fontSize: Math.round(size * 0.42),
            border: `3px solid ${borde}`,
            marginLeft: i ? -8 : 0,
          }}
          aria-hidden="true"
        >
          {inicial(p.nombre)}
        </span>
      ))}
    </div>
  );
}
