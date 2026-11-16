"use client";

import Link from "next/link";
import type { Hogar, Integrante } from "@/lib/hogar/types";
import { dinero, recolectado, reglasDe, type Movimiento } from "@/lib/premios/types";
import { useMultas } from "@/lib/premios/usePremios";
import { Avatar } from "@/components/ui/Avatar";
import { PiggyIcon } from "@/components/Icons";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

type Persona = (uid: string) => Pick<Integrante, "nombre" | "color">;

/** Lo recolectado con castigos: este mes, desde el inicio y por persona. */
export function Recolectado({ multas, mes, persona }: { multas: Movimiento[]; mes: string; persona: Persona }) {
  const r = recolectado(multas, mes);
  return (
    <div className={styles.recolectado}>
      <div className={styles.recoCifras}>
        <div>
          <span className={styles.saldo}>Multas de este mes</span>
          <b>{dinero(r.mes)}</b>
        </div>
        <div>
          <span className={styles.saldo}>Desde el inicio</span>
          <b>{dinero(r.total)}</b>
        </div>
      </div>
      {r.porPersona.length > 0 && (
        <ul className={styles.recoPersonas} aria-label="Multas pagadas por persona">
          {r.porPersona.map(([uid, monto]) => {
            const p = persona(uid);
            return (
              <li key={uid}>
                <Avatar nombre={p.nombre} color={p.color} size={24} />
                <span className={styles.recoNombre}>{p.nombre}</span>
                <b>{dinero(monto)}</b>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Tarjeta del fondo para el Resumen (dashboard). */
export function FondoResumen({ hogar, mes, persona }: { hogar: Hogar; mes: string; persona: Persona }) {
  const multas = useMultas(hogar.id);
  const reglas = reglasDe(hogar.reglas);
  const saldo = hogar.fondo?.saldo ?? 0;
  const porCobrar = hogar.fondo?.porCobrar ?? 0;
  const meta = reglas.fondoMeta;

  return (
    <section className={ui.card} aria-labelledby="t-fondo-resumen">
      <div className={styles.cardTop}>
        <div className={styles.cardTopText}>
          <h2 id="t-fondo-resumen" className={styles.h2}>
            {reglas.fondoNombre}
          </h2>
          <span className={styles.nota}>Lo que juntamos con los castigos</span>
        </div>
        <Link href="/premios#t-fondo" className={styles.verMas}>
          Ver fondo
        </Link>
      </div>
      <div className={styles.fondoFila}>
        <span className={styles.itemIcon} aria-hidden="true">
          <PiggyIcon size={24} />
        </span>
        <div className={styles.cardTopText}>
          <span className={styles.fondoSaldo}>{dinero(saldo)}</span>
          <span className={styles.saldo}>
            En caja{porCobrar > 0 ? ` · ${dinero(porCobrar)} por cobrar` : ""}
          </span>
        </div>
      </div>
      {meta ? (
        <div className={styles.cardTopText}>
          <div className={styles.barra} role="progressbar" aria-label="Avance hacia la meta" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={Math.min(saldo, meta)}>
            <span style={{ width: `${Math.min(100, (saldo / meta) * 100)}%` }} />
          </div>
          <span className={styles.saldo}>Meta: {dinero(meta)}</span>
        </div>
      ) : null}
      {multas === null ? <span className={ui.spinner} aria-label="Cargando" /> : <Recolectado multas={multas} mes={mes} persona={persona} />}
    </section>
  );
}
