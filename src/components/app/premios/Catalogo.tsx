"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { dinero, type ItemCatalogo, type Reglas } from "@/lib/premios/types";
import { AlertIcon, GiftIcon, XMarkIcon } from "@/components/Icons";
import type { Aviso } from "../quehaceres/util";
import { puedeCastigar } from "./Clasificacion";
import type { Fila, Hoja } from "./PremiosPanel";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

/** Por qué no puedo canjear esta semana (o null si puedo). */
function bloqueoCanje(f: Fila | undefined, reglas: Reglas) {
  if (!f) return "No apareces en la clasificación.";
  if (reglas.canjesPorSemana === 0) return "Por ahora tu hogar no canjea premios.";
  if (f.canjes.length >= reglas.canjesPorSemana) {
    return reglas.canjesPorSemana === 1 ? "Ya usaste tu canje de esta semana." : "Ya usaste tus canjes de esta semana.";
  }
  if (f.promedio === null) return `Cuando te califiquen y tu promedio llegue a ${reglas.umbralPremio.toFixed(1)} ★, podrás canjear.`;
  if (f.promedio < reglas.umbralPremio) {
    return `Tu promedio es ${f.promedio.toFixed(1)} ★; necesitas ${reglas.umbralPremio.toFixed(1)} para canjear.`;
  }
  return null;
}

export function Catalogo({
  catalogo,
  miFila,
  filas,
  reglas,
  semana,
  yo,
  esAdmin,
  puedeProponer,
  onAviso,
  onHoja,
}: {
  catalogo: ItemCatalogo[];
  miFila: Fila | undefined;
  filas: Fila[];
  reglas: Reglas;
  semana: string;
  yo: string;
  esAdmin: boolean;
  puedeProponer: boolean;
  onAviso: (a: Aviso) => void;
  onHoja: (h: Hoja) => void;
}) {
  const premios = catalogo.filter((c) => c.tipo === "premio" && c.estado === "aprobado").sort((a, b) => (a.puntos ?? 0) - (b.puntos ?? 0));
  const castigos = catalogo.filter((c) => c.tipo === "castigo" && c.estado === "aprobado");
  const bloqueo = bloqueoCanje(miFila, reglas);
  const saldo = miFila?.saldo ?? 0;
  const hayACastigar = filas.some((f) => puedeCastigar(f, yo, esAdmin));

  return (
    <>
      <section className={styles.columna} aria-labelledby="t-premios">
        <div className={styles.cardTopText}>
          <h2 id="t-premios" className={styles.h2Seccion}>
            Premios para canjear
          </h2>
          <p className={styles.nota}>
            Tienes <b>{saldo} pts</b>. {bloqueo ?? "Tu promedio te deja canjear: elige un premio y la familia lo aprueba."}
          </p>
        </div>
        {premios.length ? (
          <ul className={styles.items}>
            {premios.map((p) => (
              <Premio key={p.id} item={p} saldo={saldo} bloqueo={bloqueo} semana={semana} esAdmin={esAdmin} onAviso={onAviso} />
            ))}
          </ul>
        ) : (
          <Vacio texto="Todavía no hay premios." puedeProponer={puedeProponer} onHoja={onHoja} />
        )}
      </section>

      <section className={styles.columna} aria-labelledby="t-castigos">
        <h2 id="t-castigos" className={styles.h2Seccion}>
          Castigos acordados
        </h2>
        {castigos.length ? (
          <ul className={styles.items}>
            {castigos.map((c) => (
              <li key={c.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <span className={styles.itemIcon} data-tipo="castigo" aria-hidden="true">
                    <AlertIcon size={22} />
                  </span>
                  {esAdmin && <Archivar item={c} onAviso={onAviso} />}
                </div>
                <h3 className={styles.itemNombre}>{c.nombre}</h3>
                {c.descripcion && <p className={styles.itemDesc}>{c.descripcion}</p>}
                <div className={styles.itemPie}>
                  <div className={styles.badges}>
                    <span className={styles.badge}>Aprobado por la familia</span>
                    {c.monto ? (
                      <span className={styles.badge} data-tono="amarillo">
                        Multa {dinero(c.monto)} → {reglas.fondoNombre}
                      </span>
                    ) : null}
                  </div>
                  {hayACastigar && (
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.secundario}`}
                      onClick={() => onHoja({ tipo: "castigo", itemId: c.id })}
                    >
                      Proponer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio texto="Todavía no hay castigos acordados." puedeProponer={puedeProponer} onHoja={onHoja} />
        )}
      </section>
    </>
  );
}

function Premio({
  item,
  saldo,
  bloqueo,
  semana,
  esAdmin,
  onAviso,
}: {
  item: ItemCatalogo;
  saldo: number;
  bloqueo: string | null;
  semana: string;
  esAdmin: boolean;
  onAviso: (a: Aviso) => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const costo = item.puntos ?? 0;
  const falta = costo - saldo;
  const deshabilitado = ocupado || !!bloqueo || falta > 0;

  async function canjear() {
    if (!confirmar) return setConfirmar(true);
    setOcupado(true);
    try {
      const r = await api<{ estado: string }>("/api/hogar/votaciones", { body: { tipo: "canje", itemId: item.id, semana } });
      onAviso({
        tipo: "ok",
        texto:
          r.estado === "aprobada"
            ? `¡Listo! Canjeaste “${item.nombre}” por ${costo} pts.`
            : `Pediste “${item.nombre}”. La familia tiene que aprobarlo en la votación.`,
      });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setOcupado(false);
      setConfirmar(false);
    }
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemTop}>
        <span className={styles.itemIcon} aria-hidden="true">
          <GiftIcon size={22} />
        </span>
        {esAdmin && <Archivar item={item} onAviso={onAviso} />}
      </div>
      <h3 className={styles.itemNombre}>{item.nombre}</h3>
      {item.descripcion && <p className={styles.itemDesc}>{item.descripcion}</p>}
      <div className={styles.itemPie}>
        <span className={styles.itemPts}>{costo} pts</span>
        <button
          type="button"
          className={`${ui.btn} ${confirmar ? ui.primario : ui.secundario}`}
          onClick={canjear}
          onBlur={() => setConfirmar(false)}
          disabled={deshabilitado}
          title={bloqueo ?? (falta > 0 ? `Te faltan ${falta} pts` : undefined)}
        >
          {ocupado ? <span className={ui.spinner} aria-label="Canjeando" /> : confirmar ? "¿Confirmas?" : "Canjear"}
        </button>
      </div>
      {!bloqueo && falta > 0 && <span className={styles.saldo}>Te faltan {falta} pts</span>}
    </li>
  );
}

function Archivar({ item, onAviso }: { item: ItemCatalogo; onAviso: (a: Aviso) => void }) {
  const [confirmar, setConfirmar] = useState(false);

  async function archivar() {
    if (!confirmar) return setConfirmar(true);
    try {
      await api(`/api/hogar/catalogo/${item.id}`, { method: "DELETE" });
      onAviso({ tipo: "ok", texto: `“${item.nombre}” se quitó de la lista.` });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
      setConfirmar(false);
    }
  }

  return confirmar ? (
    <button type="button" className={`${ui.btn} ${ui.peligro} ${styles.editar}`} onClick={archivar} onBlur={() => setConfirmar(false)}>
      Quitar
    </button>
  ) : (
    <button type="button" className={`${ui.btn} ${ui.iconBtn} ${styles.archivar}`} onClick={archivar} aria-label={`Quitar ${item.nombre}`}>
      <XMarkIcon size={18} />
    </button>
  );
}

function Vacio({ texto, puedeProponer, onHoja }: { texto: string; puedeProponer: boolean; onHoja: (h: Hoja) => void }) {
  return (
    <div className={styles.vacio}>
      <p className={styles.texto}>
        {texto} {puedeProponer ? "Propón uno y la familia decide." : "El admin puede agregarlos."}
      </p>
      {puedeProponer && (
        <button type="button" className={`${ui.btn} ${ui.azul}`} onClick={() => onHoja({ tipo: "proponer" })}>
          Proponer
        </button>
      )}
    </div>
  );
}
