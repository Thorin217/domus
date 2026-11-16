"use client";

import { useEffect, useMemo, useState } from "react";
import { useAsignaciones } from "@/lib/quehaceres/useQuehaceres";
import { hoyISO, inicioSemana, rangoSemana, sumarDias } from "@/lib/quehaceres/types";
import {
  estadoSemana,
  promedioDe,
  reglasDe,
  type AsignacionCalificada,
  type EstadoSemana,
  type Votacion,
} from "@/lib/premios/types";
import { useCatalogo, useVotaciones } from "@/lib/premios/usePremios";
import { Sheet } from "@/components/ui/Sheet";
import { PlusIcon, SettingsIcon } from "@/components/Icons";
import { useHogarActual } from "../AppShell";
import { usePersonas, type Aviso } from "../quehaceres/util";
import { Clasificacion } from "./Clasificacion";
import { Calificar } from "./Calificar";
import { Catalogo } from "./Catalogo";
import { Votaciones } from "./Votaciones";
import { Fondo } from "./Fondo";
import { AcusarForm, CastigoForm, MovimientoForm, ProponerForm, ReglasForm } from "./Formularios";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

export type Fila = {
  uid: string;
  nombre: string;
  color: number;
  saldo: number;
  ptsSemana: number;
  promedio: number | null;
  notas: number;
  estado: EstadoSemana;
  /** Castigo abierto o aprobado de esa semana. */
  castigo: Votacion | undefined;
  /** Canjes abiertos o aprobados de esa semana. */
  canjes: Votacion[];
};

export type Hoja =
  | { tipo: "proponer" }
  | { tipo: "reglas" }
  | { tipo: "movimiento"; mov: "aporte" | "gasto" }
  | { tipo: "castigo"; itemId?: string; uid?: string }
  | { tipo: "acusar" }
  | null;

const vigente = (v: Votacion) => v.estado === "abierta" || v.estado === "aprobada";

export function PremiosPanel() {
  const { hogar, integrantes, yo, esAdmin } = useHogarActual();
  const [hoy] = useState(hoyISO);
  const lunesActual = inicioSemana(hoy);
  const lunesPasado = sumarDias(lunesActual, -7);
  const [semana, setSemana] = useState(lunesActual);
  const [hoja, setHoja] = useState<Hoja>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const reglas = reglasDe(hogar.reglas);
  const persona = usePersonas(integrantes);
  const desde = sumarDias(hoy, -14) < lunesPasado ? sumarDias(hoy, -14) : lunesPasado;
  const { guardadas, error: errorAsig } = useAsignaciones(hogar.id, desde, sumarDias(lunesActual, 6));
  const { lista: catalogo, error: errorCat } = useCatalogo(hogar.id);
  const { lista: votaciones, error: errorVot } = useVotaciones(hogar.id);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const asignaciones = guardadas as AsignacionCalificada[] | null;

  const filas = useMemo<Fila[] | null>(() => {
    if (!asignaciones || !votaciones) return null;
    const finSemana = sumarDias(semana, 6);
    const deSemana = asignaciones.filter((a) => a.fecha >= semana && a.fecha <= finSemana);
    return integrantes
      .map((i) => {
        const { promedio, notas } = promedioDe(i.uid, deSemana, reglas);
        const ptsSemana = deSemana.filter((a) => a.uid === i.uid && a.estado === "hecho").reduce((s, a) => s + (a.puntos ?? 0), 0);
        const suyas = votaciones.filter((v) => v.objetivo === i.uid && v.semana === semana && vigente(v));
        return {
          uid: i.uid,
          nombre: i.nombre,
          color: i.color,
          saldo: i.puntos ?? 0,
          ptsSemana,
          promedio,
          notas,
          estado: estadoSemana(promedio, reglas),
          castigo: suyas.find((v) => v.tipo === "castigo"),
          canjes: suyas.filter((v) => v.tipo === "canje"),
        };
      })
      .sort((a, b) => b.ptsSemana - a.ptsSemana || (b.promedio ?? 0) - (a.promedio ?? 0) || a.nombre.localeCompare(b.nombre, "es"));
    // reglas es un objeto nuevo en cada render; sus valores vienen de hogar.reglas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asignaciones, votaciones, integrantes, semana, hogar.reglas]);

  const miFila = filas?.find((f) => f.uid === yo.uid);
  const puedeProponer = reglas.catalogoConVoto || esAdmin;
  const error = errorAsig ?? errorCat ?? errorVot;
  const cerrar = () => setHoja(null);
  const listo = (texto: string) => {
    setHoja(null);
    setAviso({ tipo: "ok", texto });
  };

  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.h1}>Premios y castigos</h1>
          <p className={styles.sub}>La familia califica y la familia decide</p>
        </div>
        <div className={styles.headAcciones}>
          <div className={`${ui.segmented} ${styles.semana}`} role="group" aria-label="Semana">
            <button type="button" className={ui.segment} aria-pressed={semana === lunesActual} onClick={() => setSemana(lunesActual)}>
              Esta semana
            </button>
            <button type="button" className={ui.segment} aria-pressed={semana === lunesPasado} onClick={() => setSemana(lunesPasado)}>
              Semana pasada
            </button>
          </div>
          {integrantes.length > 1 && (
            <button type="button" className={`${ui.btn} ${ui.secundario}`} onClick={() => setHoja({ tipo: "acusar" })}>
              Acusar
            </button>
          )}
          {puedeProponer && (
            <button type="button" className={`${ui.btn} ${ui.primario}`} onClick={() => setHoja({ tipo: "proponer" })}>
              <PlusIcon size={20} />
              Proponer premio o castigo
            </button>
          )}
        </div>
      </div>

      {aviso && (
        <p className={`${ui.alerta} ${aviso.tipo === "ok" ? ui.alertaOk : ui.alertaError}`} role={aviso.tipo === "ok" ? "status" : "alert"}>
          {aviso.texto}
        </p>
      )}
      {error && <p className={`${ui.alerta} ${ui.alertaError}`}>{error}</p>}

      <section className={styles.reglas} aria-labelledby="t-reglas">
        <div className={styles.reglasTitulo}>
          <h2 id="t-reglas" className={styles.reglasTitulo}>
            Reglas de la casa
          </h2>
          {esAdmin && (
            <button type="button" className={`${ui.btn} ${ui.azul} ${styles.editar}`} onClick={() => setHoja({ tipo: "reglas" })}>
              <SettingsIcon size={18} />
              Editar
            </button>
          )}
        </div>
        <ul className={styles.reglasLista}>
          <li>Promedio de {reglas.umbralPremio.toFixed(1)} o más: puede canjear un premio.</li>
          <li>Promedio menor a {reglas.umbralCastigo.toFixed(1)}: la familia vota un castigo.</li>
          <li>Nadie se califica a sí mismo.</li>
          {reglas.noHechoCuentaComoUno && <li>Una tarea sin hacer cuenta como 1 ★.</li>}
          <li>{reglas.votacion === "todos" ? "Se aprueba si todos están de acuerdo." : "Se aprueba por mayoría."}</li>
        </ul>
      </section>

      {!filas || !asignaciones || !catalogo || !votaciones ? (
        <div className={`${ui.card} ${styles.cargando}`}>
          <span className={ui.spinner} aria-label="Cargando premios y castigos" />
        </div>
      ) : (
        <>
          <div className={styles.grid2}>
            <Clasificacion
              filas={filas}
              titulo={semana === lunesActual ? "Clasificación de la semana" : `Clasificación · ${rangoSemana(semana)}`}
              yo={yo.uid}
              esAdmin={esAdmin}
              hayCastigos={catalogo.some((c) => c.tipo === "castigo" && c.estado === "aprobado")}
              onCastigo={(uid) => setHoja({ tipo: "castigo", uid })}
            />
            <Calificar asignaciones={asignaciones} yo={yo} persona={persona} hoy={hoy} onAviso={setAviso} />
          </div>

          <Catalogo
            catalogo={catalogo}
            miFila={miFila}
            filas={filas}
            reglas={reglas}
            semana={semana}
            yo={yo.uid}
            esAdmin={esAdmin}
            puedeProponer={puedeProponer}
            onAviso={setAviso}
            onHoja={setHoja}
          />

          <div className={styles.grid2}>
            <Votaciones votaciones={votaciones} catalogo={catalogo} integrantes={integrantes} yo={yo.uid} esAdmin={esAdmin} persona={persona} onAviso={setAviso} />
            <Fondo hogar={hogar} reglas={reglas} esAdmin={esAdmin} persona={persona} onAviso={setAviso} onHoja={setHoja} />
          </div>
        </>
      )}

      <Sheet abierto={hoja?.tipo === "proponer"} onCerrar={cerrar} titulo="Proponer premio o castigo">
        {hoja?.tipo === "proponer" && <ProponerForm conVoto={reglas.catalogoConVoto} onListo={listo} />}
      </Sheet>
      <Sheet abierto={hoja?.tipo === "acusar"} onCerrar={cerrar} titulo="Acusar a alguien">
        {hoja?.tipo === "acusar" && catalogo && (
          <AcusarForm
            castigos={catalogo.filter((c) => c.tipo === "castigo" && c.estado === "aprobado")}
            integrantes={integrantes}
            yo={yo.uid}
            onListo={listo}
          />
        )}
      </Sheet>
      <Sheet abierto={hoja?.tipo === "reglas"} onCerrar={cerrar} titulo="Reglas de la casa">
        {hoja?.tipo === "reglas" && <ReglasForm reglas={reglas} onListo={listo} />}
      </Sheet>
      <Sheet
        abierto={hoja?.tipo === "movimiento"}
        onCerrar={cerrar}
        titulo={hoja?.tipo === "movimiento" && hoja.mov === "gasto" ? "Registrar gasto del fondo" : "Registrar aporte al fondo"}
      >
        {hoja?.tipo === "movimiento" && (
          <MovimientoForm tipo={hoja.mov} reglas={reglas} saldo={hogar.fondo?.saldo ?? 0} integrantes={integrantes} onListo={listo} />
        )}
      </Sheet>
      <Sheet abierto={hoja?.tipo === "castigo"} onCerrar={cerrar} titulo="Proponer castigo">
        {hoja?.tipo === "castigo" && filas && catalogo && (
          <CastigoForm
            inicial={hoja}
            castigos={catalogo.filter((c) => c.tipo === "castigo" && c.estado === "aprobado")}
            filas={filas}
            yo={yo.uid}
            esAdmin={esAdmin}
            semana={semana}
            reglas={reglas}
            onListo={listo}
          />
        )}
      </Sheet>
    </>
  );
}
