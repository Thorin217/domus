"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import type { Integrante } from "@/lib/hogar/types";
import { DIAS_NOMBRE, LIMITES_TAREAS, TODOS_LOS_DIAS, type Tarea } from "@/lib/quehaceres/types";
import { Avatar } from "@/components/ui/Avatar";
import { RepeatIcon } from "@/components/Icons";
import { DiasToggle } from "./Admin";
import ui from "@/components/ui/ui.module.css";
import styles from "./quehaceres.module.css";

/** Crear o editar una tarea del catálogo. */
export function TareaForm({
  tarea,
  integrantes,
  hoy,
  onListo,
}: {
  tarea: Tarea | null;
  integrantes: Integrante[];
  hoy: string;
  onListo: (msg: string) => void;
}) {
  const [nombre, setNombre] = useState(tarea?.nombre ?? "");
  const [puntos, setPuntos] = useState(String(tarea?.puntos ?? 10));
  const [dias, setDias] = useState<number[]>(tarea?.dias ?? TODOS_LOS_DIAS);
  const [quienes, setQuienes] = useState<string[]>(
    tarea?.candidatos.length ? tarea.candidatos : integrantes.map((i) => i.uid),
  );
  const [activa, setActiva] = useState(tarea?.activa ?? true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [fijos, setFijos] = useState(tarea?.fijos ?? {});

  async function quitarFija(dia: string) {
    if (!tarea) return;
    setOcupado(true);
    setError(null);
    try {
      await api(`/api/hogar/tareas/${tarea.id}`, { method: "PATCH", body: { quitarFijos: [dia], hoy } });
      setFijos((actual) => {
        const resto = { ...actual };
        delete resto[dia];
        return resto;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(puntos);
    if (!nombre.trim()) return setError("Escribe el nombre de la tarea.");
    if (!Number.isInteger(n) || n < LIMITES_TAREAS.puntosMin || n > LIMITES_TAREAS.puntosMax) {
      return setError(`Los puntos van de ${LIMITES_TAREAS.puntosMin} a ${LIMITES_TAREAS.puntosMax}.`);
    }
    if (!dias.length) return setError("Elige al menos un día.");
    if (!quienes.length) return setError("Elige al menos a una persona.");
    setOcupado(true);
    try {
      const body = { nombre, puntos: n, dias, candidatos: quienes, ...(tarea ? { activa } : {}) };
      if (tarea) await api(`/api/hogar/tareas/${tarea.id}`, { method: "PATCH", body });
      else await api("/api/hogar/tareas", { body });
      onListo(tarea ? "Tarea actualizada." : `“${nombre.trim()}” se agregó a las tareas de la casa.`);
    } catch (err) {
      setError((err as Error).message);
      setOcupado(false);
    }
  }

  async function borrar() {
    if (!tarea) return;
    if (!confirmarBorrar) return setConfirmarBorrar(true);
    setOcupado(true);
    try {
      await api(`/api/hogar/tareas/${tarea.id}?desde=${hoy}`, { method: "DELETE" });
      onListo(`“${tarea.nombre}” se eliminó. Lo ya hecho queda en el historial.`);
    } catch (err) {
      setError((err as Error).message);
      setOcupado(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <div className={ui.field}>
        <label className={ui.label} htmlFor="t-nombre">
          Nombre
        </label>
        <input
          id="t-nombre"
          className={ui.input}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={LIMITES_TAREAS.nombre}
          placeholder="Ej. Sacar la basura"
          autoComplete="off"
        />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor="t-puntos">
          Puntos
        </label>
        <input
          id="t-puntos"
          className={`${ui.input} ${styles.inputCorto}`}
          type="number"
          inputMode="numeric"
          min={LIMITES_TAREAS.puntosMin}
          max={LIMITES_TAREAS.puntosMax}
          value={puntos}
          onChange={(e) => setPuntos(e.target.value)}
        />
        <span className={ui.ayuda}>Las tareas más pesadas valen más. Se suman al marcarla como hecha.</span>
      </div>

      <div className={ui.field}>
        <span className={ui.label}>¿Qué días se hace?</span>
        <DiasToggle valor={dias} onCambio={setDias} etiqueta="Días en que se hace" />
      </div>

      <div className={ui.field}>
        <span className={ui.label}>¿Quién puede hacerla?</span>
        <div className={styles.quienes} role="group" aria-label="Quién puede hacerla">
          {integrantes.map((i) => {
            const activo = quienes.includes(i.uid);
            return (
              <button
                key={i.uid}
                type="button"
                className={styles.quien}
                aria-pressed={activo}
                onClick={() => setQuienes(activo ? quienes.filter((u) => u !== i.uid) : [...quienes, i.uid])}
              >
                <Avatar nombre={i.nombre} color={i.color} size={24} />
                {i.nombre}
              </button>
            );
          })}
        </div>
        <span className={ui.ayuda}>Al repartir al azar solo se elige entre estas personas.</span>
      </div>

      {tarea && Object.keys(fijos).length > 0 && (
        <div className={ui.field}>
          <span className={ui.label}>Se repite cada semana</span>
          <ul className={styles.fijas}>
            {Object.entries(fijos)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([dia, f]) => {
                const p = integrantes.find((i) => i.uid === f.uid);
                return (
                  <li key={dia} className={styles.fija}>
                    <RepeatIcon size={16} aria-hidden="true" />
                    <span className={styles.fijaTexto}>
                      Todos los {DIAS_NOMBRE[Number(dia)]}
                      {Number(dia) >= 5 ? "s" : ""}: <b>{p?.nombre ?? "Ya no está"}</b>
                    </span>
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.suave} ${styles.fijaQuitar}`}
                      onClick={() => quitarFija(dia)}
                      disabled={ocupado}
                    >
                      Quitar
                    </button>
                  </li>
                );
              })}
          </ul>
          <span className={ui.ayuda}>Al quitarla, ese día vuelve a quedar libre de hoy en adelante.</span>
        </div>
      )}

      {tarea && (
        <label className={styles.check}>
          <input type="checkbox" checked={!activa} onChange={(e) => setActiva(!e.target.checked)} />
          <span>Pausar esta tarea (no se reparte hasta que la reactives)</span>
        </label>
      )}

      {error && (
        <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={`${ui.btn} ${ui.lg} ${ui.primario} ${ui.block}`} disabled={ocupado}>
        {ocupado ? <span className={ui.spinner} aria-label="Guardando" /> : tarea ? "Guardar cambios" : "Crear tarea"}
      </button>
      {tarea && (
        <button type="button" className={`${ui.btn} ${ui.lg} ${ui.peligro} ${ui.block}`} onClick={borrar} disabled={ocupado}>
          {confirmarBorrar ? "Toca otra vez para eliminarla" : "Eliminar tarea"}
        </button>
      )}
    </form>
  );
}
