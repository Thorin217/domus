"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import type { Integrante } from "@/lib/hogar/types";
import { DIAS_ABREV, DIAS_CORTOS, DIAS_NOMBRE, numeroDia, sumarDias, textoDias, type Tarea } from "@/lib/quehaceres/types";
import { Avatar } from "@/components/ui/Avatar";
import { EditIcon, RepeatIcon, ShuffleIcon } from "@/components/Icons";
import type { Aviso } from "./util";
import ui from "@/components/ui/ui.module.css";
import styles from "./quehaceres.module.css";

/** Botones L M X J V S D. `fechas` agrega el número del día; `deshabilitados` bloquea índices. */
export function DiasToggle({
  valor,
  onCambio,
  fechas,
  deshabilitados = [],
  etiqueta,
}: {
  valor: number[];
  onCambio: (v: number[]) => void;
  fechas?: string[];
  deshabilitados?: number[];
  etiqueta: string;
}) {
  return (
    <div className={styles.diasToggle} role="group" aria-label={etiqueta}>
      {DIAS_CORTOS.map((letra, i) => {
        const activo = valor.includes(i);
        return (
          <button
            key={letra}
            type="button"
            className={styles.diaToggle}
            aria-pressed={activo}
            disabled={deshabilitados.includes(i)}
            aria-label={`${DIAS_NOMBRE[i]}${fechas ? ` ${numeroDia(fechas[i])}` : ""}`}
            onClick={() => onCambio(activo ? valor.filter((d) => d !== i) : [...valor, i].sort())}
          >
            <span>{letra}</span>
            {fechas && <small>{numeroDia(fechas[i])}</small>}
          </button>
        );
      })}
    </div>
  );
}

export function RepartirAzar({ dias, hoy, onAviso }: { dias: string[]; hoy: string; onAviso: (a: Aviso) => void }) {
  const [reemplazar, setReemplazar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const fechas = dias.filter((d) => d >= hoy);

  async function repartir() {
    setOcupado(true);
    try {
      const r = await api<{ asignadas: number }>("/api/hogar/asignaciones/repartir", { body: { fechas, reemplazar } });
      onAviso({
        tipo: "ok",
        texto: r.asignadas
          ? `Listo: se repartieron ${r.asignadas} ${r.asignadas === 1 ? "tarea" : "tareas"}.`
          : "No quedaban días sin asignar. Marca “Volver a repartir lo pendiente” para rehacerlo.",
      });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={ui.card} aria-labelledby="t-repartir">
      <div className={styles.cardHead}>
        <span className={styles.cardIcon} aria-hidden="true">
          <ShuffleIcon size={22} />
        </span>
        <h2 id="t-repartir" className={styles.h2}>
          Repartir al azar
        </h2>
      </div>
      <p className={styles.texto}>
        Domus reparte las tareas {fechas.length < 7 ? "de hoy al domingo" : "de la semana"} entre la familia: cada tarea una
        sola vez por día, nadie repite la misma tarea dos días seguidos y los puntos quedan parejos.
      </p>
      <label className={styles.check}>
        <input type="checkbox" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} />
        <span>Volver a repartir lo pendiente (lo ya hecho no se toca)</span>
      </label>
      <button
        type="button"
        className={`${ui.btn} ${ui.lg} ${ui.primario}`}
        onClick={repartir}
        disabled={ocupado || !fechas.length}
      >
        {ocupado ? <span className={ui.spinner} aria-label="Repartiendo" /> : <ShuffleIcon size={20} />}
        {fechas.length ? "Repartir esta semana" : "Esta semana ya pasó"}
      </button>
    </section>
  );
}

export function AsignarTarea({
  tareas,
  integrantes,
  dias,
  hoy,
  onAviso,
}: {
  tareas: Tarea[];
  integrantes: Integrante[];
  dias: string[];
  hoy: string;
  onAviso: (a: Aviso) => void;
}) {
  const activas = tareas.filter((t) => t.activa);
  const [tareaId, setTareaId] = useState("");
  const [uid, setUid] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [repetir, setRepetir] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tarea = activas.find((t) => t.id === tareaId);
  const pasados = dias.map((d, i) => (d < hoy ? i : -1)).filter((i) => i >= 0);
  const fueraDeCandidatos = !!tarea && !!uid && tarea.candidatos.length > 0 && !tarea.candidatos.includes(uid);

  function elegirTarea(id: string) {
    setTareaId(id);
    const t = activas.find((x) => x.id === id);
    // Sugerir los días configurados de la tarea (sin los que ya pasaron, salvo si se repite).
    if (t) setSel(repetir ? t.dias : t.dias.filter((d) => !pasados.includes(d)));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tareaId) return setError("Elige una tarea.");
    if (!uid) return setError("Elige a quién se la asignas.");
    if (!sel.length) return setError("Elige al menos un día.");
    setOcupado(true);
    try {
      // Al repetir, un día que ya pasó esta semana empieza la próxima.
      const fechas = sel.map((i) => (repetir && dias[i] < hoy ? sumarDias(dias[i], 7) : dias[i]));
      const r = await api<{ guardadas: number; omitidas: number }>("/api/hogar/asignaciones", {
        body: { tareaId, uid, fechas, repetir },
      });
      const nombre = integrantes.find((i) => i.uid === uid)?.nombre ?? "";
      onAviso({
        tipo: "ok",
        texto: repetir
          ? `${tarea?.nombre} le toca a ${nombre} ${sel.length === 7 ? "todos los días" : `todos los ${listaDias(sel)}`}, cada semana.`
          : `${tarea?.nombre} para ${nombre}: ${r.guardadas} ${r.guardadas === 1 ? "día" : "días"} de esta semana.` +
            (r.omitidas ? ` ${r.omitidas} ya estaban marcados y no se cambiaron.` : ""),
      });
      setSel([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={ui.card} aria-labelledby="t-asignar">
      <h2 id="t-asignar" className={styles.h2}>
        Asignar tarea
      </h2>
      <form className={styles.form} onSubmit={guardar} noValidate>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="asig-tarea">
            Tarea
          </label>
          <select id="asig-tarea" className={ui.input} value={tareaId} onChange={(e) => elegirTarea(e.target.value)}>
            <option value="">Elige una tarea</option>
            {activas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · {t.puntos} pts
              </option>
            ))}
          </select>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="asig-uid">
            Integrante
          </label>
          <select id="asig-uid" className={ui.input} value={uid} onChange={(e) => setUid(e.target.value)}>
            <option value="">Elige a alguien</option>
            {integrantes.map((i) => (
              <option key={i.uid} value={i.uid}>
                {i.nombre}
              </option>
            ))}
          </select>
          {fueraDeCandidatos && <span className={ui.ayuda}>Ojo: esta persona no está en la lista de quienes pueden hacerla.</span>}
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={repetir}
            onChange={(e) => {
              setRepetir(e.target.checked);
              // Solo esta semana: los días que ya pasaron no se pueden elegir.
              if (!e.target.checked) setSel((s) => s.filter((d) => !pasados.includes(d)));
            }}
          />
          <span>Repetir todas las semanas</span>
        </label>
        <div className={ui.field}>
          <span className={ui.label}>{repetir ? "Días que le toca" : "Días de esta semana"}</span>
          {repetir ? (
            <DiasToggle valor={sel} onCambio={setSel} etiqueta="Días que le toca cada semana" />
          ) : (
            <DiasToggle valor={sel} onCambio={setSel} fechas={dias} deshabilitados={pasados} etiqueta="Días de esta semana" />
          )}
          <span className={ui.ayuda}>
            {repetir
              ? "Se repite cada semana sin fecha de fin, como un cumpleaños. La quitas cuando quieras desde la tarea."
              : "Solo esta semana. Si ese día la tarea ya era de otra persona, pasa a esta."}
          </span>
        </div>
        {error && (
          <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={`${ui.btn} ${ui.lg} ${ui.primario} ${ui.block}`} disabled={ocupado}>
          {ocupado ? <span className={ui.spinner} aria-label="Guardando" /> : "Guardar en el horario"}
        </button>
      </form>
    </section>
  );
}

export function ListaTareas({
  tareas,
  persona,
  onEditar,
}: {
  tareas: Tarea[];
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  onEditar: (t: Tarea) => void;
}) {
  return (
    <section className={ui.card} aria-labelledby="t-tareas">
      <h2 id="t-tareas" className={styles.h2}>
        Tareas de la casa
      </h2>
      <ul className={styles.tareas}>
        {tareas.map((t) => (
          <li key={t.id} className={styles.tarea} data-activa={t.activa}>
            <div className={styles.tareaTexto}>
              <span className={styles.tareaNombre}>
                {t.nombre}
                {!t.activa && <span className={ui.chip}>Pausada</span>}
              </span>
              <span className={styles.tareaMeta}>
                {textoDias(t.dias)} ·{" "}
                {t.candidatos.length ? t.candidatos.map((u) => persona(u).nombre).join(", ") : "Cualquiera"}
              </span>
              {Object.keys(t.fijos).length > 0 && (
                <span className={styles.tareaFijas}>
                  <RepeatIcon size={14} />
                  {textoFijas(t, persona)}
                </span>
              )}
            </div>
            {t.candidatos.length > 0 && (
              <span className={styles.tareaAvatares} aria-hidden="true">
                {t.candidatos.slice(0, 4).map((u) => {
                  const p = persona(u);
                  return <Avatar key={u} nombre={p.nombre} color={p.color} size={24} />;
                })}
              </span>
            )}
            <span className={styles.puntos}>{t.puntos} pts</span>
            <button
              type="button"
              className={`${ui.btn} ${ui.iconBtn} ${styles.mas}`}
              onClick={() => onEditar(t)}
              aria-label={`Editar ${t.nombre}`}
            >
              <EditIcon size={20} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "lunes y jueves" */
function listaDias(dias: number[]) {
  const n = [...dias].sort().map((d) => DIAS_NOMBRE[d] + (d === 5 || d === 6 ? "s" : ""));
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}` : n[0];
}

/** "Lun Sofía · Jue Marvin" (agrupa por persona: "L, X, V Sofía"). */
export function textoFijas(t: Tarea, persona: (uid: string) => { nombre: string }) {
  const porPersona = new Map<string, number[]>();
  for (const [d, f] of Object.entries(t.fijos)) porPersona.set(f.uid, [...(porPersona.get(f.uid) ?? []), Number(d)]);
  return [...porPersona]
    .map(([uid, ds]) => `${ds.length === 7 ? "Todos los días" : ds.sort().map((d) => (ds.length === 1 ? DIAS_ABREV[d] : DIAS_CORTOS[d])).join(", ")}: ${persona(uid).nombre}`)
    .join(" · ");
}
