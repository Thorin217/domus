"use client";

import type { Integrante } from "@/lib/hogar/types";
import { DIAS_ABREV, DIAS_CORTOS, numeroDia, type Asignacion } from "@/lib/quehaceres/types";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon, RepeatIcon, XMarkIcon } from "@/components/Icons";
import { fechaLarga } from "./util";
import { FilaAsignacion } from "./Resumenes";
import ui from "@/components/ui/ui.module.css";
import styles from "./quehaceres.module.css";

type Props = {
  dias: string[];
  hoy: string;
  diaSel: string;
  onDiaSel: (d: string) => void;
  filtro: string;
  onFiltro: (f: string) => void;
  integrantes: Integrante[];
  asignaciones: Asignacion[];
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  puedeMarcar: (a: Asignacion) => boolean;
  marcando: Set<string>;
  onAlternar: (a: Asignacion) => void;
  onAbrir: (a: Asignacion) => void;
  hayTareas: boolean;
  esAdmin: boolean;
};

const ESTADO_TEXTO = { hecho: "hecha", pendiente: "pendiente", no_hecho: "no se hizo" } as const;

/**
 * Calendario semanal.
 * - Escritorio: cuadrícula integrante × día.
 * - Móvil: tira de 7 días + lista del día elegido (con casilla para marcar).
 */
export function Calendario(p: Props) {
  const visibles = p.filtro === "todos" ? p.asignaciones : p.asignaciones.filter((a) => a.uid === p.filtro);
  const filas = p.filtro === "todos" ? p.integrantes : p.integrantes.filter((i) => i.uid === p.filtro);
  // Asignaciones de gente que ya no está en el hogar también se muestran.
  const exIntegrantes = [...new Set(visibles.map((a) => a.uid))].filter((uid) => !p.integrantes.some((i) => i.uid === uid));
  const delDia = visibles.filter((a) => a.fecha === p.diaSel);

  return (
    <section className={`${ui.card} ${styles.calendario}`} aria-labelledby="t-calendario">
      <h2 id="t-calendario" className={ui.srOnly}>
        Calendario de la semana
      </h2>

      <div className={styles.calTop}>
        <div className={styles.filtro} role="group" aria-label="Ver tareas de">
          <button type="button" className={styles.filtroBtn} aria-pressed={p.filtro === "todos"} onClick={() => p.onFiltro("todos")}>
            Toda la familia
          </button>
          {p.integrantes.map((i) => (
            <button
              key={i.uid}
              type="button"
              className={styles.filtroBtn}
              aria-pressed={p.filtro === i.uid}
              onClick={() => p.onFiltro(i.uid)}
            >
              {i.nombre}
            </button>
          ))}
        </div>
        <div className={styles.leyenda} aria-hidden="true">
          <span className={styles.badge} data-estado="hecho">
            Hecho
          </span>
          <span className={styles.badge} data-estado="pendiente">
            Pendiente
          </span>
          <span className={styles.badge} data-estado="no_hecho">
            No se hizo
          </span>
        </div>
      </div>

      {/* ---------- Escritorio: cuadrícula ---------- */}
      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th scope="col" className={styles.thPersona}>
                <span className={ui.srOnly}>Integrante</span>
              </th>
              {p.dias.map((d, i) => (
                <th key={d} scope="col" className={styles.thDia} data-hoy={d === p.hoy || undefined}>
                  <span className={styles.thAbrev}>{DIAS_ABREV[i]}</span>
                  <span className={styles.thNum}>{numeroDia(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...filas.map((i) => i.uid), ...exIntegrantes].map((uid) => {
              const per = p.persona(uid);
              return (
                <tr key={uid}>
                  <th scope="row" className={styles.persona}>
                    <Avatar nombre={per.nombre} color={per.color} size={32} />
                    <span>{per.nombre}</span>
                  </th>
                  {p.dias.map((d) => (
                    <td key={d} className={styles.celda} data-hoy={d === p.hoy || undefined}>
                      {visibles
                        .filter((a) => a.uid === uid && a.fecha === d)
                        .map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className={styles.chip}
                            data-estado={a.estado}
                            onClick={() => p.onAbrir(a)}
                            title={a.tarea}
                            aria-label={`${a.tarea}, ${per.nombre}, ${fechaLarga(d)}: ${ESTADO_TEXTO[a.estado]}${a.fija ? " (se repite cada semana)" : ""}`}
                          >
                            {a.estado === "hecho" && <CheckIcon size={12} />}
                            {a.estado === "no_hecho" && <XMarkIcon size={12} strokeWidth={3} />}
                            <span>{a.tarea}</span>
                            {a.fija && <RepeatIcon size={11} className={styles.repite} aria-hidden="true" />}
                          </button>
                        ))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------- Móvil: tira de días + lista ---------- */}
      <div className={styles.movil}>
        <div className={styles.tira} role="group" aria-label="Elegir día">
          {p.dias.map((d, i) => {
            const n = visibles.filter((a) => a.fecha === d).length;
            const hechas = visibles.filter((a) => a.fecha === d && a.estado === "hecho").length;
            return (
              <button
                key={d}
                type="button"
                className={styles.dia}
                aria-pressed={d === p.diaSel}
                data-hoy={d === p.hoy || undefined}
                onClick={() => p.onDiaSel(d)}
                aria-label={`${fechaLarga(d)}${d === p.hoy ? " (hoy)" : ""}: ${n} ${n === 1 ? "tarea" : "tareas"}`}
              >
                <span className={styles.diaLetra}>{DIAS_CORTOS[i]}</span>
                <span className={styles.diaNum}>{numeroDia(d)}</span>
                <span className={styles.diaPuntos} aria-hidden="true">
                  {n > 0 && (hechas === n ? "✓" : `${hechas}/${n}`)}
                </span>
              </button>
            );
          })}
        </div>

        <h3 className={styles.diaTitulo}>
          {p.diaSel === p.hoy ? "Hoy · " : ""}
          {fechaLarga(p.diaSel)}
        </h3>

        {delDia.length ? (
          <ul className={styles.filas}>
            {delDia.map((a) => (
              <FilaAsignacion
                key={a.id}
                a={a}
                persona={p.persona(a.uid)}
                puedeMarcar={p.puedeMarcar(a)}
                ocupado={p.marcando.has(a.id)}
                onAlternar={p.onAlternar}
                onAbrir={p.onAbrir}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.nada}>
            {!p.hayTareas
              ? "No hay tareas activas."
              : p.esAdmin
                ? "Nada asignado este día. Usa “Repartir al azar” o “Asignar tarea”."
                : "Nada asignado este día."}
          </p>
        )}
      </div>

      {p.asignaciones.length === 0 && (
        <p className={`${styles.nada} ${styles.soloEscritorio}`}>
          {p.esAdmin
            ? "Esta semana todavía no tiene tareas asignadas. Usa “Repartir al azar” más abajo o asígnalas a mano."
            : "Esta semana todavía no tiene tareas asignadas."}
        </p>
      )}
    </section>
  );
}
