"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import type { Integrante } from "@/lib/hogar/types";
import { LIMITES_PREMIOS, type AsignacionCalificada } from "@/lib/premios/types";
import { sumarDias } from "@/lib/quehaceres/types";
import { Avatar } from "@/components/ui/Avatar";
import { Star } from "@/components/Icons";
import { fechaLarga, type Aviso } from "../quehaceres/util";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

const VISIBLES = 3;
const ETIQUETAS = ["", "Muy mal", "Mal", "Regular", "Bien", "Excelente"];

/** Tareas que otros hicieron en los últimos 14 días y que todavía no califico. */
export function Calificar({
  asignaciones,
  yo,
  persona,
  hoy,
  onAviso,
}: {
  asignaciones: AsignacionCalificada[];
  yo: Integrante;
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  hoy: string;
  onAviso: (a: Aviso) => void;
}) {
  const [todas, setTodas] = useState(false);
  const desde = sumarDias(hoy, -14);
  const pendientes = asignaciones
    .filter((a) => a.estado === "hecho" && a.uid !== yo.uid && a.fecha >= desde && a.fecha <= hoy && !a.calificaciones?.[yo.uid])
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const visibles = todas ? pendientes : pendientes.slice(0, VISIBLES);

  return (
    <section className={ui.card} aria-labelledby="t-calificar">
      <div className={styles.cardTopText}>
        <h2 id="t-calificar" className={styles.h2}>
          Califica a tu familia
        </h2>
        <p className={styles.nota}>
          {pendientes.length
            ? `${pendientes.length} ${pendientes.length === 1 ? "tarea espera" : "tareas esperan"} tu nota`
            : "Estás al día: no hay tareas por calificar."}
        </p>
      </div>
      {pendientes.length > 0 && (
        <ul className={styles.calificar}>
          {visibles.map((a) => (
            <ItemCalificar key={a.id} a={a} persona={persona} onAviso={onAviso} />
          ))}
        </ul>
      )}
      {pendientes.length > VISIBLES && (
        <button type="button" className={`${ui.btn} ${ui.azul} ${styles.mas}`} onClick={() => setTodas(!todas)}>
          {todas ? "Ver menos" : `Ver ${pendientes.length - VISIBLES} más`}
        </button>
      )}
    </section>
  );
}

function ItemCalificar({
  a,
  persona,
  onAviso,
}: {
  a: AsignacionCalificada;
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  onAviso: (a: Aviso) => void;
}) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const p = persona(a.uid);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!estrellas) return onAviso({ tipo: "error", texto: "Elige de 1 a 5 estrellas antes de enviar." });
    setOcupado(true);
    try {
      await api(`/api/hogar/asignaciones/${a.id}/calificar`, { body: { estrellas, comentario } });
      onAviso({ tipo: "ok", texto: `Nota enviada: ${a.tarea} de ${p.nombre}, ${estrellas} ★.` });
    } catch (err) {
      onAviso({ tipo: "error", texto: (err as Error).message });
      setOcupado(false);
    }
  }

  return (
    <li className={styles.calItem}>
      <div className={styles.calHead}>
        <Avatar nombre={p.nombre} color={p.color} size={36} />
        <div className={styles.cardTopText}>
          <span className={styles.calTarea}>{a.tarea}</span>
          <span className={styles.saldo}>
            {p.nombre} · {fechaLarga(a.fecha)}
          </span>
        </div>
      </div>
      <form className={styles.form} onSubmit={enviar} noValidate>
        <div className={styles.estrellas} role="radiogroup" aria-label={`Nota para ${a.tarea} de ${p.nombre}`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}: ${ETIQUETAS[n]}`}
              className={styles.estrella}
              onClick={() => setEstrellas(n)}
            >
              <Star filled={n <= estrellas} size={30} />
            </button>
          ))}
        </div>
        <div className={styles.calForm}>
          <input
            className={ui.input}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={LIMITES_PREMIOS.comentario}
            placeholder="Comentario (opcional)"
            aria-label="Comentario (opcional)"
          />
          <button type="submit" className={`${ui.btn} ${ui.primario}`} disabled={ocupado}>
            {ocupado ? <span className={ui.spinner} aria-label="Enviando" /> : "Enviar nota"}
          </button>
        </div>
      </form>
    </li>
  );
}
