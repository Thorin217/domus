"use client";

import { useState } from "react";
import type { Compra } from "@/lib/gastos/types";
import { rangoMes } from "./Partes";
import { Sheet } from "@/components/ui/Sheet";
import { PlusIcon, SettingsIcon } from "@/components/Icons";
import { useHogarActual } from "../AppShell";
import { usePersonas } from "../quehaceres/util";
import { FiltroTipo, Indicadores, ListaCompras, MesNav, PorCategoria, PorIntegrante } from "./Partes";
import { CompraForm, PresupuestoForm } from "./Formularios";
import { useGastosMes } from "./useGastosMes";
import ui from "@/components/ui/ui.module.css";
import styles from "./gastos.module.css";

type Hoja = { tipo: "compra"; compra: Compra | null } | { tipo: "presupuesto" } | null;

export function ComprasPanel() {
  const { hogar, integrantes, yo, esAdmin } = useHogarActual();
  const g = useGastosMes(hogar);
  const [hoja, setHoja] = useState<Hoja>(null);
  const persona = usePersonas(integrantes);
  const puedeEditar = (c: Compra) => esAdmin || c.creadoPor === yo.uid || c.pagadoPor === yo.uid;
  const listo = (texto: string) => {
    setHoja(null);
    g.setAviso({ tipo: "ok", texto });
  };

  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.h1}>Compras y gastos</h1>
          <p className={styles.sub}>
            {hogar.nombre} · {rangoMes(g.mes)}
          </p>
        </div>
        <div className={styles.headAcciones}>
          <MesNav mes={g.mes} onCambio={g.cambiarMes} max={g.actual} />
          <FiltroTipo valor={g.filtro} onCambio={g.setFiltro} />
          {esAdmin && (
            <button type="button" className={`${ui.btn} ${ui.azul}`} onClick={() => setHoja({ tipo: "presupuesto" })}>
              <SettingsIcon size={18} />
              Presupuesto
            </button>
          )}
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

      {!g.resumen || !g.visibles ? (
        <div className={`${ui.card} ${styles.cargando}`}>
          <span className={ui.spinner} aria-label="Cargando las compras" />
        </div>
      ) : (
        <>
          <Indicadores r={g.resumen} presupuesto={g.presupuesto} filtro={g.filtro} esAdmin={esAdmin} onPresupuesto={() => setHoja({ tipo: "presupuesto" })} />
          <div className={styles.grid2}>
            <PorCategoria r={g.resumen} categorias={g.categorias} presupuesto={g.presupuesto} />
            <PorIntegrante r={g.resumen} integrantes={integrantes} />
          </div>
          <ListaCompras
            compras={g.visibles}
            categorias={g.categorias}
            persona={persona}
            titulo={`Compras de ${g.mes === g.actual ? "este mes" : "ese mes"} (${g.visibles.length})`}
            puedeEditar={puedeEditar}
            onEditar={(c) => setHoja({ tipo: "compra", compra: c })}
            vacio={g.filtro === "personal" ? "No hay compras personales este mes." : "Todavía no hay compras este mes. Anota la primera con “Agregar compra”."}
          />
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
