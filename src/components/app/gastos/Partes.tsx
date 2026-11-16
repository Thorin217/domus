"use client";

import Link from "next/link";
import type { Integrante } from "@/lib/hogar/types";
import { estiloIntegrante } from "@/lib/hogar/types";
import { mesCorto, numeroDia } from "@/lib/quehaceres/types";
import {
  diasDelMes,
  moneda,
  nombreMes,
  textoVence,
  type Categoria,
  type Compra,
  type FijoDelMes,
  type Filtro,
  type Presupuesto,
  type resumenMes,
} from "@/lib/gastos/types";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/Icons";
import ui from "@/components/ui/ui.module.css";
import styles from "./gastos.module.css";

export type Persona = (uid: string) => Pick<Integrante, "nombre" | "color">;
type Resumen = ReturnType<typeof resumenMes>;

/** "14 nov" */
export function fechaCorta(iso: string) {
  return `${numeroDia(iso)} ${mesCorto(iso)}`;
}

/** "1 al 30 de noviembre de 2026" */
export function rangoMes(mes: string) {
  const [a] = mes.split("-");
  return `1 al ${diasDelMes(mes)} de ${nombreMes(mes, false)} de ${a}`;
}

export function nombreCategoria(categorias: Categoria[], id: string) {
  return categorias.find((c) => c.id === id)?.nombre ?? "Otra";
}

export function MesNav({ mes, onCambio, max }: { mes: string; onCambio: (delta: number) => void; max?: string }) {
  return (
    <div className={styles.mes} role="group" aria-label="Mes">
      <button type="button" className={styles.mesBtn} onClick={() => onCambio(-1)} aria-label="Mes anterior">
        <ChevronLeftIcon size={20} />
      </button>
      <span className={styles.mesTexto} aria-live="polite">
        {nombreMes(mes)}
      </span>
      <button
        type="button"
        className={styles.mesBtn}
        onClick={() => onCambio(1)}
        aria-label="Mes siguiente"
        disabled={max !== undefined && mes >= max}
      >
        <ChevronRightIcon size={20} />
      </button>
    </div>
  );
}

export function FiltroTipo({ valor, onCambio }: { valor: Filtro; onCambio: (f: Filtro) => void }) {
  const opciones: [Filtro, string][] = [
    ["todos", "Todos"],
    ["familiar", "Familiares"],
    ["personal", "Personales"],
  ];
  return (
    <div className={`${ui.segmented} ${styles.filtro}`} role="group" aria-label="Qué compras ver">
      {opciones.map(([v, t]) => (
        <button key={v} type="button" className={ui.segment} aria-pressed={valor === v} onClick={() => onCambio(v)}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function TipoBadge({ c }: { c: Pick<Compra, "tipo" | "gastoFijoId"> }) {
  if (c.gastoFijoId)
    return (
      <span className={styles.badge} data-tono="amarillo">
        Fijo
      </span>
    );
  return c.tipo === "familiar" ? (
    <span className={styles.badge} data-tono="azul">
      Familiar
    </span>
  ) : (
    <span className={styles.badge}>Personal</span>
  );
}

export function Indicadores({
  r,
  presupuesto,
  filtro,
  esAdmin,
  onPresupuesto,
}: {
  r: Resumen;
  presupuesto: Presupuesto;
  filtro: Filtro;
  esAdmin: boolean;
  onPresupuesto?: () => void;
}) {
  const pct = presupuesto.total ? Math.round((r.comprometido / presupuesto.total) * 100) : null;
  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Total del mes</span>
        <span className={styles.statValue}>{moneda(r.total)}</span>
        <span className={styles.badge}>
          {filtro === "personal" ? "No cuentan en el presupuesto" : pct !== null ? `${pct}% del presupuesto` : "Sin presupuesto"}
        </span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Gastos fijos</span>
        <span className={styles.statValue}>{moneda(r.totalFijos)}</span>
        <span className={styles.badge} data-tono="azul">
          {r.fijosCantidad ? `${r.fijosPagados} de ${r.fijosCantidad} pagados` : "Ninguno este mes"}
        </span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Compras del día a día</span>
        <span className={styles.statValue}>{moneda(r.totalDiaADia)}</span>
        <span className={styles.badge} data-tono="amarillo">
          {r.cantidadDiaADia} {r.cantidadDiaADia === 1 ? "compra anotada" : "compras anotadas"}
        </span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Presupuesto disponible</span>
        {r.disponible === null ? (
          <>
            <span className={styles.statValue}>—</span>
            {esAdmin && onPresupuesto ? (
              <button type="button" className={styles.link} onClick={onPresupuesto} style={{ minHeight: 24 }}>
                Definir presupuesto
              </button>
            ) : (
              <span className={styles.badge}>Sin presupuesto</span>
            )}
          </>
        ) : (
          <>
            <span className={styles.statValue} data-negativo={r.disponible < 0}>
              {moneda(r.disponible)}
            </span>
            {r.disponible < 0 ? (
              <span className={styles.badge} data-tono="mal">
                Te pasaste del plan
              </span>
            ) : pct !== null && pct >= 90 ? (
              <span className={styles.badge} data-tono="amarillo">
                Cerca del límite
              </span>
            ) : (
              <span className={styles.badge} data-tono="ok">
                Dentro del plan
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function PorCategoria({ r, categorias, presupuesto }: { r: Resumen; categorias: Categoria[]; presupuesto: Presupuesto }) {
  const filas = [...r.porCategoria].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  // También las categorías con tope aunque no tengan gastos en el filtro.
  for (const id of Object.keys(presupuesto.porCategoria)) if (!filas.some(([c]) => c === id)) filas.push([id, 0]);
  const max = Math.max(1, ...filas.map(([, v]) => v));

  return (
    <section className={ui.card} aria-labelledby="t-cat">
      <h2 id="t-cat" className={styles.h2}>
        Gasto por categoría
      </h2>
      {filas.length ? (
        <ul className={styles.barras}>
          {filas.map(([id, monto]) => {
            const tope = presupuesto.porCategoria[id];
            const usado = r.porCategoriaFamiliar.get(id) ?? 0;
            const estado = tope ? (usado > tope ? "pasado" : usado >= tope * 0.9 ? "cerca" : "ok") : undefined;
            return (
              <li key={id} className={styles.barraCuerpo}>
                <div className={styles.barraTexto}>
                  <span className={styles.barraNombre}>{nombreCategoria(categorias, id)}</span>
                  <span className={styles.barraMonto}>{moneda(monto)}</span>
                </div>
                <div className={styles.pista} data-estado={estado} aria-hidden="true">
                  <span style={{ width: `${tope ? Math.min(100, (usado / tope) * 100) : (monto / max) * 100}%` }} />
                </div>
                {tope ? (
                  <span className={styles.tope}>
                    Presupuesto: {moneda(usado)} de {moneda(tope)}
                    {estado === "pasado" ? (
                      <span className={styles.badge} data-tono="mal">
                        Te pasaste {moneda(usado - tope)}
                      </span>
                    ) : estado === "cerca" ? (
                      <span className={styles.badge} data-tono="amarillo">
                        Cerca del tope
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.nota}>Todavía no hay gastos este mes.</p>
      )}
    </section>
  );
}

/** Para que el amarillo y el celeste se lean sobre la pista gris. */
const BARRA_OSCURA: Record<string, string> = { "#FDC500": "#D9A900", "#8DB7E8": "#5E93D6" };

export function PorIntegrante({ r, integrantes }: { r: Resumen; integrantes: Integrante[] }) {
  const filas = integrantes
    .map((i) => ({ i, monto: r.porIntegrante.get(i.uid) ?? 0 }))
    .sort((a, b) => b.monto - a.monto);
  const max = Math.max(1, ...filas.map((f) => f.monto));
  return (
    <section className={ui.card} aria-labelledby="t-int">
      <h2 id="t-int" className={styles.h2}>
        Gasto por integrante
      </h2>
      <ul className={styles.barras}>
        {filas.map(({ i, monto }) => {
          const fondo = estiloIntegrante(i.color).background as string;
          return (
            <li key={i.uid} className={styles.barraFila}>
              <Avatar nombre={i.nombre} color={i.color} size={32} />
              <div className={styles.barraCuerpo}>
                <div className={styles.barraTexto}>
                  <span className={styles.barraNombre}>{i.nombre}</span>
                  <span className={styles.barraMonto}>{moneda(monto)}</span>
                </div>
                <div className={styles.pista} aria-hidden="true">
                  <span style={{ width: `${(monto / max) * 100}%`, background: BARRA_OSCURA[fondo] ?? fondo }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.nota}>Lo que pagó cada quien, incluidos los gastos fijos.</p>
    </section>
  );
}

export function ListaCompras({
  compras,
  categorias,
  persona,
  titulo,
  verTodas,
  puedeEditar,
  onEditar,
  vacio,
}: {
  compras: Compra[];
  categorias: Categoria[];
  persona: Persona;
  titulo: string;
  verTodas?: string;
  puedeEditar: (c: Compra) => boolean;
  onEditar: (c: Compra) => void;
  vacio: string;
}) {
  return (
    <section className={ui.card} aria-labelledby="t-compras">
      <div className={styles.cardHead}>
        <h2 id="t-compras" className={styles.h2}>
          {titulo}
        </h2>
        {verTodas && (
          <Link href={verTodas} className={styles.link}>
            Ver todas
          </Link>
        )}
      </div>
      {!compras.length ? (
        <p className={styles.nota}>{vacio}</p>
      ) : (
        <>
          <ul className={`${styles.lista} ${styles.listaMovil}`}>
            {compras.map((c) => {
              const p = persona(c.pagadoPor);
              const editable = puedeEditar(c);
              return (
                <li key={c.id} className={styles.compra}>
                  <button
                    type="button"
                    className={styles.compraBtn}
                    onClick={() => onEditar(c)}
                    disabled={!editable}
                    aria-label={editable ? `Editar ${c.concepto}, ${moneda(c.monto)}` : undefined}
                  >
                    <Avatar nombre={p.nombre} color={p.color} size={32} />
                    <span className={styles.compraTexto}>
                      <span className={styles.compraConcepto}>{c.concepto}</span>
                      <span className={styles.compraMeta}>
                        {nombreCategoria(categorias, c.categoria)} · {p.nombre} · {fechaCorta(c.fecha)}
                        <TipoBadge c={c} />
                      </span>
                    </span>
                    <span className={styles.compraMonto}>{moneda(c.monto)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={styles.tablaWrap}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th scope="col">Concepto</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Pagó</th>
                  <th scope="col">Fecha</th>
                  <th scope="col" className={styles.tdMonto}>
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => {
                  const p = persona(c.pagadoPor);
                  const editable = puedeEditar(c);
                  return (
                    <tr key={c.id} data-editable={editable} onClick={editable ? () => onEditar(c) : undefined}>
                      <td className={styles.tdConcepto}>
                        {editable ? (
                          <button type="button" className={styles.editarBtn} onClick={() => onEditar(c)} aria-label={`Editar ${c.concepto}`}>
                            {c.concepto}
                          </button>
                        ) : (
                          c.concepto
                        )}
                      </td>
                      <td className={styles.tdMuted}>{nombreCategoria(categorias, c.categoria)}</td>
                      <td>
                        <TipoBadge c={c} />
                      </td>
                      <td>
                        <span className={styles.persona}>
                          <Avatar nombre={p.nombre} color={p.color} size={24} />
                          {p.nombre}
                        </span>
                      </td>
                      <td className={styles.tdMuted}>{fechaCorta(c.fecha)}</td>
                      <td className={styles.tdMonto}>{moneda(c.monto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export function FechaCaja({ iso, atrasado }: { iso: string; atrasado?: boolean }) {
  return (
    <span className={styles.fecha} data-estado={atrasado ? "atrasado" : undefined} aria-hidden="true">
      <b>{numeroDia(iso)}</b>
      <small>{mesCorto(iso)}</small>
    </span>
  );
}

export function EstadoFijoBadge({ f, persona }: { f: FijoDelMes; persona?: Persona }) {
  const e = f.estado;
  if (e.tipo === "pagado")
    return (
      <span className={styles.badge} data-tono="ok">
        Pagado{persona ? ` · ${persona(e.compra.pagadoPor).nombre}` : ""}
      </span>
    );
  if (e.tipo === "atrasado")
    return (
      <span className={styles.badge} data-tono="mal">
        Atrasado
      </span>
    );
  if (e.tipo === "pronto")
    return (
      <span className={styles.badge} data-tono="amarillo">
        Pronto
      </span>
    );
  return null;
}

/** Lo que falta pagar del mes (atrasados primero). */
export function ProximosFijos({ fijos, max = 4 }: { fijos: FijoDelMes[]; max?: number }) {
  const pendientes = fijos.filter((f) => f.estado.tipo !== "pagado").slice(0, max);
  return (
    <section className={ui.card} aria-labelledby="t-proximos">
      <div className={styles.cardHead}>
        <h2 id="t-proximos" className={styles.h2}>
          Próximos gastos fijos
        </h2>
        <Link href="/gastos-fijos" className={styles.link}>
          Ver todos
        </Link>
      </div>
      {pendientes.length ? (
        <ul className={styles.fijos}>
          {pendientes.map((f) => (
            <li key={f.fijo.id} className={styles.fijo}>
              <FechaCaja iso={f.vence} atrasado={f.estado.tipo === "atrasado"} />
              <span className={styles.fijoTexto}>
                <span className={styles.fijoNombre}>{f.fijo.nombre}</span>
                <span className={styles.nota}>{textoVence(f)}</span>
              </span>
              <span className={styles.fijoDerecha}>
                <span className={styles.compraMonto}>{moneda(f.monto)}</span>
                <EstadoFijoBadge f={f} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.nota}>{fijos.length ? "Todo pagado este mes." : "Todavía no hay gastos fijos."}</p>
      )}
    </section>
  );
}
