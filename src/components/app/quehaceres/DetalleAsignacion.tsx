"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { Integrante } from "@/lib/hogar/types";
import { DIAS_NOMBRE, diaSemana, type Asignacion, type EstadoTarea } from "@/lib/quehaceres/types";
import { Avatar } from "@/components/ui/Avatar";
import { fechaLarga } from "./util";
import ui from "@/components/ui/ui.module.css";
import styles from "./quehaceres.module.css";

const ESTADO = {
  hecho: "Hecho",
  pendiente: "Pendiente",
  no_hecho: "No se hizo",
} as const;

/** Detalle de una tarea del horario: marcarla y, si eres admin, reasignarla o quitarla. */
export function DetalleAsignacion({
  asignacion: a,
  integrantes,
  persona,
  esAdmin,
  puedeMarcar,
  esFutura,
  onListo,
}: {
  asignacion: Asignacion;
  integrantes: Integrante[];
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  esAdmin: boolean;
  puedeMarcar: boolean;
  esFutura: boolean;
  onListo: (msg?: string) => void;
}) {
  const [destino, setDestino] = useState(a.uid);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = persona(a.uid);

  async function ejecutar(fn: () => Promise<unknown>, msg?: string) {
    setOcupado(true);
    setError(null);
    try {
      await fn();
      onListo(msg);
    } catch (e) {
      setError((e as Error).message);
      setOcupado(false);
    }
  }

  const estado = (e: EstadoTarea) =>
    ejecutar(() => api(`/api/hogar/asignaciones/${a.id}`, { method: "PATCH", body: { estado: e } }));

  return (
    <div className={styles.detalle}>
      <div className={styles.detalleQuien}>
        <Avatar nombre={p.nombre} color={p.color} size={40} />
        <div className={styles.filaTexto}>
          <span className={styles.filaTarea}>{p.nombre}</span>
          <span className={styles.filaQuien}>
            {fechaLarga(a.fecha)} · +{a.puntos} pts
          </span>
        </div>
        <span className={styles.badge} data-estado={a.estado}>
          {ESTADO[a.estado]}
        </span>
      </div>

      {a.fija && (
        <p className={styles.notaFija}>
          Se repite todos los {DIAS_NOMBRE[diaSemana(a.fecha)]}
          {diaSemana(a.fecha) >= 5 ? "s" : ""}. Reasignar o quitar aquí cambia solo este día; la regla se edita desde la
          tarea.
        </p>
      )}

      {puedeMarcar && (
        <div className={styles.detalleBotones}>
          {a.estado !== "hecho" && (
            <button type="button" className={`${ui.btn} ${ui.lg} ${ui.primario}`} disabled={ocupado} onClick={() => estado("hecho")}>
              Marcar como hecha
            </button>
          )}
          {a.estado !== "pendiente" && (
            <button type="button" className={`${ui.btn} ${ui.lg} ${ui.secundario}`} disabled={ocupado} onClick={() => estado("pendiente")}>
              Dejar pendiente
            </button>
          )}
          {esAdmin && a.estado !== "no_hecho" && (
            <button type="button" className={`${ui.btn} ${ui.lg} ${ui.peligro}`} disabled={ocupado} onClick={() => estado("no_hecho")}>
              No se hizo
            </button>
          )}
        </div>
      )}
      {esFutura && <p className={ui.ayuda}>Se podrá marcar cuando llegue el día.</p>}

      {esAdmin && a.estado === "pendiente" && (
        <div className={styles.detalleReasignar}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="reasignar">
              {a.fija ? "Pasar a (solo este día)" : "Pasar a"}
            </label>
            <select id="reasignar" className={ui.input} value={destino} onChange={(e) => setDestino(e.target.value)}>
              {integrantes.map((i) => (
                <option key={i.uid} value={i.uid}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={`${ui.btn} ${ui.lg} ${ui.secundario}`}
            disabled={ocupado || destino === a.uid}
            onClick={() =>
              ejecutar(
                () => api(`/api/hogar/asignaciones/${a.id}`, { method: "PATCH", body: { uid: destino } }),
                `${a.tarea} ahora le toca a ${persona(destino).nombre}.`,
              )
            }
          >
            Reasignar
          </button>
        </div>
      )}

      {error && (
        <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
          {error}
        </p>
      )}

      {esAdmin && (
        <button
          type="button"
          className={`${ui.btn} ${ui.suave} ${ui.block}`}
          disabled={ocupado}
          onClick={() =>
            ejecutar(() => api(`/api/hogar/asignaciones/${a.id}`, { method: "DELETE" }), `${a.tarea} se quitó del horario.`)
          }
        >
          {a.fija ? "Quitar solo este día" : "Quitar del horario"}
        </button>
      )}
      {!puedeMarcar && !esAdmin && !esFutura && <p className={ui.ayuda}>Solo {p.nombre} o el admin pueden marcar esta tarea.</p>}
    </div>
  );
}
