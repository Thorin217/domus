"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./sheet.module.css";

/**
 * Hoja inferior en móvil / diálogo centrado en escritorio, sobre <dialog> nativo
 * (foco atrapado, Escape y fondo inerte gratis).
 */
export function Sheet({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={titulo}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
    >
      <div className={styles.body}>
        <span className={styles.grip} aria-hidden="true" />
        {/* Foco inicial en el título: en móvil no abre el teclado al mostrar la hoja */}
        <h2 className={styles.title} tabIndex={-1} autoFocus>
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
