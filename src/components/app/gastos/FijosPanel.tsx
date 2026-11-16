"use client";

import { useState } from "react";
import { moneda, nombreMes, textoVence, type FijoDelMes, type GastoFijo } from "@/lib/gastos/types";
import { Sheet } from "@/components/ui/Sheet";
import { EditIcon, PlusIcon } from "@/components/Icons";
import { useHogarActual } from "../AppShell";
import { usePersonas } from "../quehaceres/util";
import { EstadoFijoBadge, FechaCaja, MesNav, fechaCorta, nombreCategoria } from "./Partes";
import { CompraForm, FijoForm, PagarFijoForm } from "./Formularios";
import { useGastosMes } from "./useGastosMes";
import ui from "@/components/ui/ui.module.css";
import styles from "./gastos.module.css";

type Hoja = { tipo: "fijo"; fijo: GastoFijo | null } | { tipo: "pagar"; f: FijoDelMes } | { tipo: "pago"; f: FijoDelMes } | null;

export function FijosPanel() {
  const { hogar, integrantes, yo, esAdmin } = useHogarActual();
  const g = useGastosMes(hogar);
  const [hoja, setHoja] = useState<Hoja>(null);
  const persona = usePersonas(integrantes);
  const listo = (texto: string) => {
    setHoja(null);
    g.setAviso({ tipo: "ok", texto });
  };
  const lista = g.delMes;
  const total = lista?.reduce((s, f) => s + f.monto, 0) ?? 0;
  const pagado = lista?.filter((f) => f.estado.tipo === "pagado").reduce((s, f) => s + f.monto, 0) ?? 0;
  const pausados = (g.fijos ?? []).filter((f) => !f.activo && !lista?.some((x) => x.fijo.id === f.id));
  const futuro = g.mes > g.actual;

  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.h1}>Gastos fijos</h1>
          <p className={styles.sub}>Alquiler, servicios y colegio: lo que se paga cada mes</p>
        </div>
        <div className={styles.headAcciones}>
          <MesNav mes={g.mes} onCambio={g.cambiarMes} />
          {esAdmin && (
            <button type="button" className={`${ui.btn} ${ui.primario} ${styles.agregar}`} onClick={() => setHoja({ tipo: "fijo", fijo: null })}>
              <PlusIcon size={20} />
              Nuevo gasto fijo
            </button>
          )}
        </div>
      </div>

      {g.aviso && (
        <p className={`${ui.alerta} ${g.aviso.tipo === "ok" ? ui.alertaOk : ui.alertaError}`} role={g.aviso.tipo === "ok" ? "status" : "alert"}>
          {g.aviso.texto}
        </p>
      )}
      {g.error && <p className={`${ui.alerta} ${ui.alertaError}`}>{g.error}</p>}

      {!lista ? (
        <div className={`${ui.card} ${styles.cargando}`}>
          <span className={ui.spinner} aria-label="Cargando los gastos fijos" />
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total de {nombreMes(g.mes, false)}</span>
              <span className={styles.statValue}>{moneda(total)}</span>
              <span className={styles.badge} data-tono="azul">
                {lista.length} {lista.length === 1 ? "gasto" : "gastos"}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Pagado</span>
              <span className={styles.statValue}>{moneda(pagado)}</span>
              <span className={styles.badge} data-tono="ok">
                {lista.filter((f) => f.estado.tipo === "pagado").length} de {lista.length}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Por pagar</span>
              <span className={styles.statValue}>{moneda(total - pagado)}</span>
              {lista.some((f) => f.estado.tipo === "atrasado") ? (
                <span className={styles.badge} data-tono="mal">
                  {lista.filter((f) => f.estado.tipo === "atrasado").length} atrasado(s)
                </span>
              ) : (
                <span className={styles.badge}>Al día</span>
              )}
            </div>
          </div>

          {lista.length ? (
            <ul className={styles.fijosGrid}>
              {lista.map((f) => {
                const pago = f.estado.tipo === "pagado" ? f.estado.compra : null;
                const puedeDeshacer = pago && (esAdmin || pago.creadoPor === yo.uid || pago.pagadoPor === yo.uid);
                return (
                  <li key={f.fijo.id} className={styles.fijoTarjeta}>
                    <div className={styles.fijoTop}>
                      <FechaCaja iso={f.vence} atrasado={f.estado.tipo === "atrasado"} />
                      <span className={styles.fijoTexto}>
                        <span className={styles.fijoNombre}>{f.fijo.nombre}</span>
                        <span className={styles.nota}>{nombreCategoria(g.categorias, f.fijo.categoria)}</span>
                      </span>
                      <span className={styles.fijoDerecha}>
                        <span className={styles.compraMonto}>{moneda(f.monto)}</span>
                      </span>
                    </div>
                    <div className={styles.tope}>
                      <EstadoFijoBadge f={f} />
                      <span>
                        {pago
                          ? `${persona(pago.pagadoPor).nombre} · ${fechaCorta(pago.fecha)}${pago.monto !== f.fijo.monto ? ` (esperado ${moneda(f.fijo.monto)})` : ""}`
                          : textoVence(f)}
                      </span>
                    </div>
                    <div className={styles.fijoAcciones}>
                      {!pago && !futuro && (
                        <button type="button" className={`${ui.btn} ${f.estado.tipo === "pendiente" ? ui.secundario : ui.primario}`} onClick={() => setHoja({ tipo: "pagar", f })}>
                          Marcar pagado
                        </button>
                      )}
                      {puedeDeshacer && (
                        <button type="button" className={`${ui.btn} ${ui.suave}`} onClick={() => setHoja({ tipo: "pago", f })}>
                          Ver pago
                        </button>
                      )}
                      {esAdmin && (
                        <button
                          type="button"
                          className={`${ui.btn} ${ui.iconBtn} ${styles.iconBtn}`}
                          onClick={() => setHoja({ tipo: "fijo", fijo: f.fijo })}
                          aria-label={`Editar ${f.fijo.nombre}`}
                        >
                          <EditIcon size={18} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={ui.card}>
              <p className={styles.texto}>
                {esAdmin
                  ? "Agrega lo que se paga cada mes (alquiler, luz, internet, colegio) con su día de vencimiento: Domus te avisa antes y lo suma al presupuesto."
                  : "Todavía no hay gastos fijos. El admin del hogar los agrega."}
              </p>
              {esAdmin && (
                <button type="button" className={`${ui.btn} ${ui.primario}`} style={{ alignSelf: "flex-start" }} onClick={() => setHoja({ tipo: "fijo", fijo: null })}>
                  <PlusIcon size={20} />
                  Agregar el primero
                </button>
              )}
            </div>
          )}

          {esAdmin && pausados.length > 0 && (
            <section className={ui.card} aria-labelledby="t-pausados">
              <h2 id="t-pausados" className={styles.h2}>
                Pausados
              </h2>
              <ul className={styles.fijos}>
                {pausados.map((f) => (
                  <li key={f.id} className={styles.fijo}>
                    <span className={styles.fijoTexto}>
                      <span className={styles.fijoNombre}>{f.nombre}</span>
                      <span className={styles.nota}>
                        {moneda(f.monto)} · día {f.dia}
                      </span>
                    </span>
                    <button type="button" className={`${ui.btn} ${ui.azul}`} onClick={() => setHoja({ tipo: "fijo", fijo: f })}>
                      Editar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Sheet abierto={hoja?.tipo === "fijo"} onCerrar={() => setHoja(null)} titulo={hoja?.tipo === "fijo" && hoja.fijo ? "Editar gasto fijo" : "Nuevo gasto fijo"}>
        {hoja?.tipo === "fijo" && <FijoForm key={hoja.fijo?.id ?? "nuevo"} fijo={hoja.fijo} categorias={g.categorias} mes={g.mes < g.actual ? g.actual : g.mes} onListo={listo} />}
      </Sheet>
      <Sheet abierto={hoja?.tipo === "pagar"} onCerrar={() => setHoja(null)} titulo={hoja?.tipo === "pagar" ? `Pagar ${hoja.f.fijo.nombre}` : "Pagar"}>
        {hoja?.tipo === "pagar" && <PagarFijoForm key={hoja.f.fijo.id} f={hoja.f} mes={g.mes} hoy={g.hoy} integrantes={integrantes} yo={yo.uid} onListo={listo} />}
      </Sheet>
      <Sheet abierto={hoja?.tipo === "pago"} onCerrar={() => setHoja(null)} titulo="Pago del gasto fijo">
        {hoja?.tipo === "pago" && hoja.f.estado.tipo === "pagado" && (
          <CompraForm
            key={hoja.f.estado.compra.id}
            compra={hoja.f.estado.compra}
            categorias={g.categorias}
            integrantes={integrantes}
            yo={yo.uid}
            hoy={g.hoy}
            onListo={listo}
          />
        )}
      </Sheet>
    </>
  );
}
