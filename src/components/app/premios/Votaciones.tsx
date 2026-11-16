"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import type { Integrante } from "@/lib/hogar/types";
import { LIMITES_PREMIOS, dinero, votantes, type ItemCatalogo, type Votacion, type Voto } from "@/lib/premios/types";
import { useAhora } from "@/lib/premios/usePremios";
import { Avatar } from "@/components/ui/Avatar";
import type { Aviso } from "../quehaceres/util";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

type Persona = (uid: string) => Pick<Integrante, "nombre" | "color">;

function tituloDe(v: Votacion, catalogo: ItemCatalogo[], persona: Persona) {
  switch (v.tipo) {
    case "canje":
      return `${persona(v.objetivo ?? "").nombre} quiere canjear: ${v.titulo} (${v.puntos} pts)`;
    case "castigo":
      return `Castigo para ${persona(v.objetivo ?? "").nombre}: ${v.titulo}`;
    case "acusacion":
      return `${persona(v.creadoPor).nombre} acusa a ${persona(v.objetivo ?? "").nombre}`;
    case "gasto":
      return `Gastar del fondo: ${v.titulo} (${dinero(v.monto ?? 0)})`;
    default: {
      const item = catalogo.find((c) => c.id === v.itemId);
      return `${item?.tipo === "castigo" ? "Nuevo castigo" : "Nuevo premio"}: ${v.titulo}`;
    }
  }
}

/** "Falta tu voto." · "Falta el voto de Sofía y Mateo." · "Falta tu voto y el de Sofía." */
function textoFaltan(faltan: string[], yo: string, persona: Persona) {
  const otros = faltan.filter((u) => u !== yo).map((u) => persona(u).nombre);
  const lista = otros.length > 1 ? `${otros.slice(0, -1).join(", ")} y ${otros[otros.length - 1]}` : otros[0];
  if (faltan.includes(yo)) return otros.length ? `Falta tu voto y el de ${lista}.` : "Falta tu voto.";
  return `Falta el voto de ${lista}.`;
}

const horaPlazo = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

const ESTADO_TEXTO = { aprobada: "Aprobada", rechazada: "Rechazada", cancelada: "Cancelada", abierta: "Abierta" } as const;
const ESTADO_TONO = { aprobada: "ok", rechazada: "mal", cancelada: undefined, abierta: "azul" } as const;

export function Votaciones({
  votaciones,
  catalogo,
  integrantes,
  yo,
  esAdmin,
  persona,
  onAviso,
}: {
  votaciones: Votacion[];
  catalogo: ItemCatalogo[];
  integrantes: Integrante[];
  yo: string;
  esAdmin: boolean;
  persona: Persona;
  onAviso: (a: Aviso) => void;
}) {
  const abiertas = votaciones.filter((v) => v.estado === "abierta");
  const cerradas = votaciones.filter((v) => v.estado !== "abierta").slice(0, 10);
  const uids = integrantes.map((i) => i.uid);

  return (
    <section className={ui.card} aria-labelledby="t-votacion">
      <div className={styles.cardTopText}>
        <h2 id="t-votacion" className={styles.h2}>
          Votación de la familia
        </h2>
        {!abiertas.length && <p className={styles.nota}>No hay nada por votar ahora.</p>}
      </div>
      {abiertas.length > 0 && (
        <ul className={styles.votos}>
          {abiertas.map((v) => (
            <ItemVotacion
              key={v.id}
              v={v}
              titulo={tituloDe(v, catalogo, persona)}
              elegibles={votantes(v, uids)}
              yo={yo}
              esAdmin={esAdmin}
              persona={persona}
              onAviso={onAviso}
            />
          ))}
        </ul>
      )}
      {cerradas.length > 0 && (
        <details className={styles.historial}>
          <summary>Historial ({cerradas.length})</summary>
          <ul className={styles.historialLista}>
            {cerradas.map((v) => (
              <li key={v.id} className={styles.historialItem}>
                <span className={styles.movTexto}>
                  <span>{tituloDe(v, catalogo, persona)}</span>
                  {v.motivo && <span className={styles.saldo}>{v.motivo}</span>}
                </span>
                <span className={styles.badge} data-tono={ESTADO_TONO[v.estado]}>
                  {ESTADO_TEXTO[v.estado]}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ItemVotacion({
  v,
  titulo,
  elegibles,
  yo,
  esAdmin,
  persona,
  onAviso,
}: {
  v: Votacion;
  titulo: string;
  elegibles: string[];
  yo: string;
  esAdmin: boolean;
  persona: Persona;
  onAviso: (a: Aviso) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const miVoto = v.votos?.[yo];
  const voto = elegibles.includes(yo);
  const faltan = elegibles.filter((u) => !v.votos?.[u]);
  // Nadie cancela una votación sobre sí mismo (ni siendo admin), salvo que la haya abierto.
  const puedeCancelar = v.creadoPor === yo || (esAdmin && v.objetivo !== yo);
  const ahora = useAhora();
  const esAcusacion = v.tipo === "acusacion";
  const soyAcusado = esAcusacion && v.objetivo === yo;
  const vencio = esAcusacion && ahora > (v.acusacion?.plazo ?? 0);
  const esperaDefensa = esAcusacion && !v.defensa && !v.aceptada && !vencio;
  const acusado = persona(v.objetivo ?? "").nombre;

  async function contar() {
    setOcupado(true);
    try {
      const r = await api<{ estado: string }>(`/api/hogar/votaciones/${v.id}`, { method: "PATCH", body: { cerrar: true } });
      onAviso({ tipo: "ok", texto: r.estado === "aprobada" ? `Se aprobó el castigo para ${acusado}.` : `Se rechazó la acusación contra ${acusado}.` });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  async function votar(valor: Voto) {
    setOcupado(true);
    try {
      const r = await api<{ estado: string }>(`/api/hogar/votaciones/${v.id}`, { method: "PATCH", body: { voto: valor } });
      if (r.estado === "aprobada") onAviso({ tipo: "ok", texto: `Aprobado: ${v.titulo}.` });
      else if (r.estado === "rechazada") onAviso({ tipo: "ok", texto: `Rechazado: ${v.titulo}.` });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  async function cancelar() {
    setOcupado(true);
    try {
      await api(`/api/hogar/votaciones/${v.id}`, { method: "DELETE" });
      onAviso({ tipo: "ok", texto: "Se canceló la votación." });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
      setOcupado(false);
    }
  }

  return (
    <li className={styles.voto} data-tipo={v.tipo}>
      <div className={styles.votoTexto}>
        <span className={styles.votoTitulo}>{titulo}</span>
        <span className={styles.nota}>
          {esAcusacion ? `Castigo propuesto: ${v.titulo} · ${v.detalle.replace(/\.+$/, "")}.` : `${v.detalle.replace(/\.+$/, "")}.`}
          {faltan.length > 0 && ` ${textoFaltan(faltan, yo, persona)}`}
        </span>
      </div>
      {esAcusacion && (
        <div className={styles.votoCuerpo}>
          <blockquote className={styles.acusacion}>
            <span className={styles.citaQuien}>Lo que pasó, según {v.creadoPor === yo ? "tú" : persona(v.creadoPor).nombre}</span>
            {v.acusacion?.motivo}
          </blockquote>
          {v.defensa ? (
            <blockquote className={styles.defensa}>
              <span className={styles.citaQuien}>Defensa de {soyAcusado ? "ti" : acusado}</span>
              {v.defensa.texto}
            </blockquote>
          ) : v.aceptada ? null : (
            <p className={styles.nota}>
              {vencio
                ? `${acusado} no respondió a tiempo. Ya se pueden contar los votos.`
                : `${soyAcusado ? "Tienes" : `${acusado} tiene`} hasta el ${horaPlazo.format(v.acusacion?.plazo ?? 0)} para defenderse. Mientras, ya pueden votar; se decide cuando responda o venza el plazo.`}
            </p>
          )}
          {soyAcusado && <Defensa v={v} onAviso={onAviso} />}
        </div>
      )}
      <div className={styles.votoAcciones}>
        <span className={styles.votantes}>
          {elegibles.map((u) => {
            const p = persona(u);
            const estado = v.votos?.[u] ?? "pendiente";
            return (
              <span
                key={u}
                className={styles.votante}
                data-voto={estado}
                title={`${p.nombre}: ${estado === "si" ? "aprobó" : estado === "no" ? "rechazó" : "falta votar"}`}
              >
                <Avatar nombre={p.nombre} color={p.color} size={30} />
              </span>
            );
          })}
        </span>
        {voto && (
          <span className={styles.botones}>
            <button
              type="button"
              className={`${ui.btn} ${miVoto === "si" ? ui.primario : ui.secundario}`}
              aria-pressed={miVoto === "si"}
              onClick={() => votar("si")}
              disabled={ocupado}
            >
              Aprobar
            </button>
            <button
              type="button"
              className={`${ui.btn} ${miVoto === "no" ? ui.peligro : ui.secundario}`}
              aria-pressed={miVoto === "no"}
              onClick={() => votar("no")}
              disabled={ocupado}
            >
              Rechazar
            </button>
          </span>
        )}
        {vencio && (
          <button type="button" className={`${ui.btn} ${ui.azul}`} onClick={contar} disabled={ocupado}>
            Contar votos
          </button>
        )}
        {puedeCancelar && (
          <button type="button" className={`${ui.btn} ${ui.suave}`} onClick={cancelar} disabled={ocupado}>
            {esAcusacion && v.creadoPor === yo ? "Retirar" : "Cancelar"}
          </button>
        )}
        {esperaDefensa && !soyAcusado && <span className={styles.badge} data-tono="amarillo">Esperando defensa</span>}
      </div>
    </li>
  );
}

/** El acusado escribe su defensa (puede corregirla mientras siga abierta) o acepta el castigo. */
function Defensa({ v, onAviso }: { v: Votacion; onAviso: (a: Aviso) => void }) {
  const [texto, setTexto] = useState(v.defensa?.texto ?? "");
  const [aceptar, setAceptar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(body: { texto?: string; aceptar?: boolean }) {
    setOcupado(true);
    try {
      const r = await api<{ estado: string }>(`/api/hogar/votaciones/${v.id}/defensa`, { body });
      onAviso({
        tipo: "ok",
        texto: body.aceptar
          ? "Aceptaste el castigo."
          : r.estado === "abierta"
            ? "Tu defensa quedó publicada. La familia la lee y vota."
            : r.estado === "aprobada"
              ? "La familia ya había votado: se aprobó el castigo."
              : "La familia ya había votado: se rechazó la acusación.",
      });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setOcupado(false);
      setAceptar(false);
    }
  }

  function defender(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return onAviso({ tipo: "error", texto: "Escribe tu defensa." });
    enviar({ texto });
  }

  return (
    <form className={styles.form} onSubmit={defender} noValidate>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`def-${v.id}`}>
          {v.defensa ? "Corregir tu defensa" : "Tu defensa"}
        </label>
        <textarea
          id={`def-${v.id}`}
          className={`${ui.input} ${styles.textarea}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITES_PREMIOS.defensa}
          placeholder="Cuenta tu versión."
        />
      </div>
      <div className={styles.botones} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" className={`${ui.btn} ${ui.primario}`} disabled={ocupado}>
          {v.defensa ? "Actualizar defensa" : "Enviar defensa"}
        </button>
        <button
          type="button"
          className={`${ui.btn} ${aceptar ? ui.peligro : ui.suave}`}
          onClick={() => (aceptar ? enviar({ aceptar: true }) : setAceptar(true))}
          disabled={ocupado}
        >
          {aceptar ? "¿Seguro? Acepto el castigo" : "Acepto el castigo"}
        </button>
      </div>
    </form>
  );
}
