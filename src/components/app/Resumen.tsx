"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useHogarActual } from "./AppShell";
import { useAsignaciones, useTareas } from "@/lib/quehaceres/useQuehaceres";
import { horarioDe } from "@/lib/quehaceres/fijas";
import { nombreMes, type Compra } from "@/lib/gastos/types";
import { Sheet } from "@/components/ui/Sheet";
import { CheckIcon, PlusIcon } from "@/components/Icons";
import { usePersonas } from "./quehaceres/util";
import { FiltroTipo, Indicadores, ListaCompras, PorCategoria, PorIntegrante, ProximosFijos, rangoMes } from "./gastos/Partes";
import { CompraForm, PresupuestoForm } from "./gastos/Formularios";
import { useGastosMes } from "./gastos/useGastosMes";
import { FondoResumen } from "./premios/Recolectado";
import ui from "@/components/ui/ui.module.css";
import styles from "./gastos/gastos.module.css";

type Hoja = { tipo: "compra"; compra: Compra | null } | { tipo: "presupuesto" } | null;

export function Resumen() {
  const { hogar, integrantes, yo, esAdmin } = useHogarActual();
  const g = useGastosMes(hogar);
  const [hoja, setHoja] = useState<Hoja>(null);
  const persona = usePersonas(integrantes);
  const solo = integrantes.length === 1;
  const puedeEditar = (c: Compra) => esAdmin || c.creadoPor === yo.uid || c.pagadoPor === yo.uid;
  const listo = (texto: string) => {
    setHoja(null);
    g.setAviso({ tipo: "ok", texto });
  };

  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.h1}>Resumen de {nombreMes(g.mes, false)}</h1>
          <p className={styles.sub}>
            {hogar.nombre} · {rangoMes(g.mes)}
          </p>
        </div>
        <div className={styles.headAcciones}>
          <FiltroTipo valor={g.filtro} onCambio={g.setFiltro} />
          <button type="button" className={`${ui.btn} ${ui.primario} ${styles.agregar}`} onClick={() => setHoja({ tipo: "compra", compra: null })}>
            <PlusIcon size={20} />
            Agregar compra
          </button>
        </div>
      </div>

      {g.aviso && (
        <p className={`${ui.alerta} ${g.aviso.tipo === "ok" ? ui.alertaOk : ui.alertaError}`} role={g.aviso.tipo === "ok" ? "status" : "alert"}>
          {g.aviso.texto}
        </p>
      )}
      {g.error && <p className={`${ui.alerta} ${ui.alertaError}`}>{g.error}</p>}

      {solo && esAdmin && (
        <section className={styles.invitar}>
          <div className={styles.invitarText}>
            <h2 className={styles.h2}>Invita a tu familia</h2>
            <p>
              Domus funciona mejor cuando todos anotan. Comparte el código <b>{hogar.codigo}</b>.
            </p>
          </div>
          <Link href="/familia" className={`${ui.btn} ${ui.lg} ${ui.primario}`} style={{ alignSelf: "flex-start" }}>
            Invitar
          </Link>
        </section>
      )}

      {!g.resumen || !g.visibles || !g.delMes ? (
        <div className={`${ui.card} ${styles.cargando}`}>
          <span className={ui.spinner} aria-label="Cargando el resumen" />
        </div>
      ) : (
        <>
          <Indicadores r={g.resumen} presupuesto={g.presupuesto} filtro={g.filtro} esAdmin={esAdmin} onPresupuesto={() => setHoja({ tipo: "presupuesto" })} />
          <div className={styles.grid2}>
            <PorCategoria r={g.resumen} categorias={g.categorias} presupuesto={g.presupuesto} />
            <PorIntegrante r={g.resumen} integrantes={integrantes} />
          </div>
          <div className={styles.grid2}>
            <ListaCompras
              compras={g.visibles.slice(0, 6)}
              categorias={g.categorias}
              persona={persona}
              titulo="Últimas compras"
              verTodas="/compras"
              puedeEditar={puedeEditar}
              onEditar={(c) => setHoja({ tipo: "compra", compra: c })}
              vacio="Todavía no hay compras este mes. Anota la primera con “Agregar compra”."
            />
            <div className={styles.columna}>
              <ProximosFijos fijos={g.delMes} />
              <FondoResumen hogar={hogar} mes={g.actual} persona={persona} />
              <HoyEnCasa hogarId={hogar.id} hoy={g.hoy} persona={persona} />
            </div>
          </div>
        </>
      )}

      <Sheet abierto={hoja?.tipo === "compra"} onCerrar={() => setHoja(null)} titulo={hoja?.tipo === "compra" && hoja.compra ? "Editar compra" : "Agregar compra"}>
        {hoja?.tipo === "compra" && (
          <CompraForm
            key={hoja.compra?.id ?? "nueva"}
            compra={hoja.compra}
            categorias={g.categorias}
            integrantes={integrantes}
            yo={yo.uid}
            hoy={g.hoy}
            onListo={listo}
          />
        )}
      </Sheet>
      <Sheet abierto={hoja?.tipo === "presupuesto"} onCerrar={() => setHoja(null)} titulo="Presupuesto del mes">
        {hoja?.tipo === "presupuesto" && <PresupuestoForm presupuesto={g.presupuesto} categorias={g.categorias} onListo={listo} />}
      </Sheet>
    </>
  );
}

function HoyEnCasa({ hogarId, hoy, persona }: { hogarId: string; hoy: string; persona: ReturnType<typeof usePersonas> }) {
  const { tareas } = useTareas(hogarId);
  const { guardadas } = useAsignaciones(hogarId, hoy, hoy);
  const lista = useMemo(() => (tareas && guardadas ? horarioDe([hoy], tareas, guardadas) : null), [tareas, guardadas, hoy]);

  return (
    <section className={ui.card} aria-labelledby="t-hoy-casa">
      <div className={styles.cardHead}>
        <h2 id="t-hoy-casa" className={styles.h2}>
          Hoy en casa
        </h2>
        <Link href="/quehaceres" className={styles.link}>
          Ver horario
        </Link>
      </div>
      {lista === null ? (
        <span className={ui.spinner} aria-label="Cargando" />
      ) : lista.length ? (
        <ul className={styles.hoy}>
          {lista.map((a) => {
            const hecho = a.estado === "hecho";
            return (
              <li key={a.id} className={styles.hoyFila}>
                <span className={styles.check} data-hecho={hecho}>
                  {hecho && <CheckIcon size={14} />}
                </span>
                <span className={styles.compraTexto}>
                  <span className={styles.compraConcepto}>{a.tarea}</span>
                  <span className={styles.nota}>
                    {persona(a.uid).nombre}
                    <span className={ui.srOnly}>{hecho ? ", hecha" : a.estado === "no_hecho" ? ", no se hizo" : ", pendiente"}</span>
                  </span>
                </span>
                <span className={styles.pts}>+{a.puntos} pts</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.nota}>Hoy no hay tareas en el horario.</p>
      )}
    </section>
  );
}
