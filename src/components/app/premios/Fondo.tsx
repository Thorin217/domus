"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { Hogar, Integrante } from "@/lib/hogar/types";
import { dinero, type Movimiento, type Reglas } from "@/lib/premios/types";
import { useMovimientos, useMultas } from "@/lib/premios/usePremios";
import { Recolectado } from "./Recolectado";
import { hoyISO } from "@/lib/quehaceres/types";
import { PiggyIcon } from "@/components/Icons";
import { fechaLarga, type Aviso } from "../quehaceres/util";
import type { Hoja } from "./PremiosPanel";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

const RECIENTES = 6;

export function Fondo({
  hogar,
  reglas,
  esAdmin,
  persona,
  onAviso,
  onHoja,
}: {
  hogar: Hogar;
  reglas: Reglas;
  esAdmin: boolean;
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  onAviso: (a: Aviso) => void;
  onHoja: (h: Hoja) => void;
}) {
  const { lista: movimientos } = useMovimientos(hogar.id);
  const todas = useMultas(hogar.id);
  const multas = todas?.filter((m) => !m.pagado) ?? null;
  const saldo = hogar.fondo?.saldo ?? 0;
  const porCobrar = hogar.fondo?.porCobrar ?? 0;
  const meta = reglas.fondoMeta;
  const pagados = (movimientos ?? []).filter((m) => m.pagado).slice(0, RECIENTES);

  return (
    <section className={ui.card} aria-labelledby="t-fondo">
      <div className={styles.cardTop}>
        <div className={styles.cardTopText}>
          <h2 id="t-fondo" className={styles.h2}>
            {reglas.fondoNombre}
          </h2>
          <p className={styles.nota}>Las multas de los castigos se juntan aquí para gastarlas en familia.</p>
        </div>
        <span className={styles.itemIcon} aria-hidden="true">
          <PiggyIcon size={24} />
        </span>
      </div>

      <div className={styles.cardTopText}>
        <span className={styles.fondoSaldo}>{dinero(saldo)}</span>
        {meta ? (
          <>
            <div
              className={styles.barra}
              role="progressbar"
              aria-label="Avance hacia la meta"
              aria-valuemin={0}
              aria-valuemax={meta}
              aria-valuenow={Math.min(saldo, meta)}
            >
              <span style={{ width: `${Math.min(100, (saldo / meta) * 100)}%` }} />
            </div>
            <span className={styles.saldo}>
              Meta: {dinero(meta)} {saldo >= meta ? "· ¡Lo lograron!" : `· faltan ${dinero(meta - saldo)}`}
            </span>
          </>
        ) : null}
        {porCobrar > 0 && (
          <div className={styles.fondoDatos}>
            <span>
              Por cobrar: <b>{dinero(porCobrar)}</b>
            </span>
          </div>
        )}
      </div>

      {todas && <Recolectado multas={todas} mes={hoyISO().slice(0, 7)} persona={persona} />}

      {esAdmin && (
        <div className={styles.multaAcciones}>
          <button type="button" className={`${ui.btn} ${ui.primario}`} onClick={() => onHoja({ tipo: "movimiento", mov: "gasto" })} disabled={saldo <= 0}>
            Registrar gasto
          </button>
          <button type="button" className={`${ui.btn} ${ui.secundario}`} onClick={() => onHoja({ tipo: "movimiento", mov: "aporte" })}>
            Registrar aporte
          </button>
        </div>
      )}

      {multas && multas.length > 0 && (
        <div className={styles.cardTopText}>
          <h3 className={styles.calTarea}>Multas por cobrar</h3>
          <ul className={styles.movs}>
            {multas.map((m) => (
              <Multa key={m.id} m={m} esAdmin={esAdmin} persona={persona} onAviso={onAviso} />
            ))}
          </ul>
        </div>
      )}

      <div className={styles.cardTopText}>
        <h3 className={styles.calTarea}>Movimientos</h3>
        {movimientos === null ? (
          <span className={ui.spinner} aria-label="Cargando movimientos" />
        ) : pagados.length ? (
          <ul className={styles.movs}>
            {pagados.map((m) => {
              const entra = m.tipo !== "gasto";
              return (
                <li key={m.id} className={styles.mov}>
                  <span className={styles.movTexto}>
                    <span className={styles.movDesc}>{m.descripcion}</span>
                    <span className={styles.saldo}>
                      {m.tipo === "multa" ? `Multa de ${persona(m.uid ?? "").nombre}` : m.tipo === "aporte" ? (m.uid ? `Aporte de ${persona(m.uid).nombre}` : "Aporte") : "Gasto"}
                      {" · "}
                      {fechaLarga(m.creadoEn?.toDate ? hoyISO(m.creadoEn.toDate()) : m.fecha)}
                    </span>
                  </span>
                  <span className={styles.movMonto} data-signo={entra ? "+" : "-"}>
                    {entra ? "+" : "−"}
                    {dinero(m.monto)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.nota}>Todavía no hay movimientos.</p>
        )}
      </div>
    </section>
  );
}

function Multa({
  m,
  esAdmin,
  persona,
  onAviso,
}: {
  m: Movimiento;
  esAdmin: boolean;
  persona: (uid: string) => Pick<Integrante, "nombre" | "color">;
  onAviso: (a: Aviso) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [perdonar, setPerdonar] = useState(false);
  const nombre = persona(m.uid ?? "").nombre;

  async function accion(metodo: "PATCH" | "DELETE") {
    if (metodo === "DELETE" && !perdonar) return setPerdonar(true);
    setOcupado(true);
    try {
      await api(`/api/hogar/fondo/${m.id}`, { method: metodo });
      onAviso({
        tipo: "ok",
        texto: metodo === "PATCH" ? `${dinero(m.monto)} de ${nombre} entraron al fondo.` : `Se perdonó la multa de ${nombre}.`,
      });
    } catch (e) {
      onAviso({ tipo: "error", texto: (e as Error).message });
      setOcupado(false);
    }
  }

  return (
    <li className={styles.multa}>
      <div className={styles.mov} style={{ padding: 0, border: 0 }}>
        <span className={styles.movTexto}>
          <span className={styles.movDesc}>{nombre}</span>
          <span className={styles.saldo}>{m.descripcion}</span>
        </span>
        <span className={styles.movMonto}>{dinero(m.monto)}</span>
      </div>
      {esAdmin && (
        <div className={styles.multaAcciones}>
          <button type="button" className={`${ui.btn} ${ui.azul}`} onClick={() => accion("PATCH")} disabled={ocupado}>
            Marcar pagada
          </button>
          <button type="button" className={`${ui.btn} ${ui.suave}`} onClick={() => accion("DELETE")} disabled={ocupado}>
            {perdonar ? "¿Perdonarla?" : "Perdonar"}
          </button>
        </div>
      )}
    </li>
  );
}
