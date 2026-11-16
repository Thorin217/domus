"use client";

import type { Integrante } from "@/lib/hogar/types";
import { estiloIntegrante } from "@/lib/hogar/types";
import type { Asignacion } from "@/lib/quehaceres/types";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon, MoreIcon, RepeatIcon, XMarkIcon } from "@/components/Icons";
import { fechaLarga } from "./util";
import ui from "@/components/ui/ui.module.css";
import styles from "./quehaceres.module.css";

/** Fila de una tarea del día: casilla (hecho / pendiente / no se hizo), nombre, quién y puntos. */
export function FilaAsignacion({
  a,
  persona,
  puedeMarcar,
  ocupado,
  onAlternar,
  onAbrir,
}: {
  a: Asignacion;
  persona: Pick<Integrante, "nombre" | "color">;
  puedeMarcar: boolean;
  ocupado: boolean;
  onAlternar: (a: Asignacion) => void;
  onAbrir: (a: Asignacion) => void;
}) {
  const casilla = (
    <span className={styles.casilla} data-estado={a.estado} aria-hidden="true">
      {a.estado === "hecho" && <CheckIcon size={14} />}
      {a.estado === "no_hecho" && <XMarkIcon size={14} strokeWidth={3} />}
    </span>
  );

  return (
    <li className={styles.fila} data-estado={a.estado}>
      {puedeMarcar && a.estado !== "no_hecho" ? (
        <button
          type="button"
          className={styles.casillaBtn}
          onClick={() => onAlternar(a)}
          disabled={ocupado}
          aria-pressed={a.estado === "hecho"}
          aria-label={`${a.tarea}: marcar como ${a.estado === "hecho" ? "pendiente" : "hecha"}`}
        >
          {casilla}
        </button>
      ) : (
        <span className={styles.casillaBtn}>{casilla}</span>
      )}
      <div className={styles.filaTexto}>
        <span className={styles.filaTarea}>{a.tarea}</span>
        <span className={styles.filaQuien}>
          <Avatar nombre={persona.nombre} color={persona.color} size={18} />
          {persona.nombre}
          {a.estado === "no_hecho" && " · no se hizo"}
          {a.fija && (
            <span className={styles.repiteTexto}>
              <RepeatIcon size={12} aria-hidden="true" />
              cada semana
            </span>
          )}
        </span>
      </div>
      <span className={styles.puntos}>+{a.puntos} pts</span>
      <button
        type="button"
        className={`${ui.btn} ${ui.iconBtn} ${styles.mas}`}
        onClick={() => onAbrir(a)}
        aria-label={`Detalles de ${a.tarea}`}
      >
        <MoreIcon size={20} />
      </button>
    </li>
  );
}

export function HoyEnCasa({
  hoy,
  asignaciones,
  persona,
  puedeMarcar,
  marcando,
  onAlternar,
  onAbrir,
}: {
  hoy: string;
  asignaciones: Asignacion[];
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  puedeMarcar: (a: Asignacion) => boolean;
  marcando: Set<string>;
  onAlternar: (a: Asignacion) => void;
  onAbrir: (a: Asignacion) => void;
}) {
  return (
    <section className={`${ui.card} ${styles.hoy}`} aria-labelledby="t-hoy">
      <h2 id="t-hoy" className={styles.h2}>
        Hoy · {fechaLarga(hoy)}
      </h2>
      {asignaciones.length ? (
        <ul className={styles.filas}>
          {asignaciones.map((a) => (
            <FilaAsignacion
              key={a.id}
              a={a}
              persona={persona(a.uid)}
              puedeMarcar={puedeMarcar(a)}
              ocupado={marcando.has(a.id)}
              onAlternar={onAlternar}
              onAbrir={onAbrir}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.nada}>Hoy no hay tareas en el horario.</p>
      )}
    </section>
  );
}

/** Para que el amarillo y el celeste se lean sobre la pista gris. */
const BARRA_OSCURA: Record<string, string> = { "#FDC500": "#D9A900", "#8DB7E8": "#5E93D6" };

export function Cumplimiento({ integrantes, asignaciones }: { integrantes: Integrante[]; asignaciones: Asignacion[] }) {
  return (
    <section className={ui.card} aria-labelledby="t-cumplimiento">
      <h2 id="t-cumplimiento" className={styles.h2}>
        Cumplimiento de la semana
      </h2>
      <ul className={styles.cumplimiento}>
        {integrantes.map((i) => {
          const suyas = asignaciones.filter((a) => a.uid === i.uid);
          const hechas = suyas.filter((a) => a.estado === "hecho");
          const puntos = hechas.reduce((s, a) => s + a.puntos, 0);
          const pct = suyas.length ? Math.round((hechas.length / suyas.length) * 100) : 0;
          const fondo = estiloIntegrante(i.color).background;
          return (
            <li key={i.uid} className={styles.cumpleFila}>
              <Avatar nombre={i.nombre} color={i.color} size={32} />
              <div className={styles.cumpleCuerpo}>
                <div className={styles.cumpleTexto}>
                  <span className={styles.cumpleNombre}>{i.nombre}</span>
                  <span className={styles.cumpleCifra}>
                    {suyas.length ? `${hechas.length} de ${suyas.length} · ${puntos} pts` : "Sin tareas"}
                  </span>
                </div>
                <div
                  className={styles.pista}
                  role="progressbar"
                  aria-label={`Cumplimiento de ${i.nombre}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <div style={{ width: `${pct}%`, background: BARRA_OSCURA[fondo] ?? fondo }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
