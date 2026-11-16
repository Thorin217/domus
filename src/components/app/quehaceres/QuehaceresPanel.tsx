"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useAsignaciones, useTareas } from "@/lib/quehaceres/useQuehaceres";
import { horarioDe } from "@/lib/quehaceres/fijas";
import {
  diasDeSemana,
  hoyISO,
  inicioSemana,
  rangoSemana,
  sumarDias,
  type Asignacion,
  type Tarea,
} from "@/lib/quehaceres/types";
import { Sheet } from "@/components/ui/Sheet";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@/components/Icons";
import { useHogarActual } from "../AppShell";
import { Calendario } from "./Calendario";
import { Cumplimiento, HoyEnCasa } from "./Resumenes";
import { AsignarTarea, ListaTareas, RepartirAzar } from "./Admin";
import { DetalleAsignacion } from "./DetalleAsignacion";
import { TareaForm } from "./TareaForm";
import ui from "@/components/ui/ui.module.css";
import styles from "./quehaceres.module.css";
import { usePersonas, type Aviso } from "./util";

type Hoja = { tipo: "tarea"; tarea: Tarea | null } | { tipo: "asignacion"; id: string } | null;

export function QuehaceresPanel() {
  const { hogar, integrantes, yo, esAdmin } = useHogarActual();
  const [hoy] = useState(hoyISO);
  const [lunes, setLunes] = useState(() => inicioSemana(hoy));
  const [diaSel, setDiaSel] = useState(hoy);
  const [filtro, setFiltro] = useState<string>("todos");
  const [hoja, setHoja] = useState<Hoja>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [marcando, setMarcando] = useState<Set<string>>(new Set());

  const dias = useMemo(() => diasDeSemana(lunes), [lunes]);
  const { tareas, error: errorTareas } = useTareas(hogar.id);
  const { guardadas, error: errorAsig } = useAsignaciones(hogar.id, dias[0], dias[6]);
  // Lo guardado + las asignaciones fijas de esa semana (se repiten sin fin, como un cumpleaños).
  const asignaciones = useMemo(
    () => (tareas && guardadas ? horarioDe(dias, tareas, guardadas) : null),
    [dias, tareas, guardadas],
  );
  const persona = usePersonas(integrantes);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  function irASemana(nuevoLunes: string) {
    setLunes(nuevoLunes);
    setDiaSel(nuevoLunes === inicioSemana(hoy) ? hoy : nuevoLunes);
  }

  const puedeMarcar = (a: Asignacion) => (esAdmin || a.uid === yo.uid) && a.fecha <= hoy;

  async function alternar(a: Asignacion) {
    if (marcando.has(a.id)) return;
    setMarcando((s) => new Set(s).add(a.id));
    try {
      await api(`/api/hogar/asignaciones/${a.id}`, {
        method: "PATCH",
        body: { estado: a.estado === "hecho" ? "pendiente" : "hecho" },
      });
    } catch (e) {
      setAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setMarcando((s) => {
        const n = new Set(s);
        n.delete(a.id);
        return n;
      });
    }
  }

  const esSemanaActual = lunes === inicioSemana(hoy);
  const asignacionAbierta = hoja?.tipo === "asignacion" ? asignaciones?.find((a) => a.id === hoja.id) : undefined;
  const cargando = tareas === null || asignaciones === null;
  const sinTareas = tareas !== null && tareas.length === 0;

  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.h1}>Quehaceres</h1>
          <p className={styles.sub}>Horario semanal de cada integrante</p>
        </div>
        <div className={styles.headAcciones}>
          <div className={styles.semana} role="group" aria-label="Semana">
            <button
              type="button"
              className={styles.semanaBtn}
              onClick={() => irASemana(sumarDias(lunes, -7))}
              aria-label="Semana anterior"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <span className={styles.semanaTexto} aria-live="polite">
              {rangoSemana(lunes)}
            </span>
            <button
              type="button"
              className={styles.semanaBtn}
              onClick={() => irASemana(sumarDias(lunes, 7))}
              aria-label="Semana siguiente"
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>
          {!esSemanaActual && (
            <button type="button" className={`${ui.btn} ${ui.azul}`} onClick={() => irASemana(inicioSemana(hoy))}>
              Hoy
            </button>
          )}
          {esAdmin && (
            <button type="button" className={`${ui.btn} ${ui.primario}`} onClick={() => setHoja({ tipo: "tarea", tarea: null })}>
              <PlusIcon size={20} />
              Nueva tarea
            </button>
          )}
        </div>
      </div>

      {aviso && (
        <p className={`${ui.alerta} ${aviso.tipo === "ok" ? ui.alertaOk : ui.alertaError}`} role={aviso.tipo === "ok" ? "status" : "alert"}>
          {aviso.texto}
        </p>
      )}
      {(errorTareas || errorAsig) && <p className={`${ui.alerta} ${ui.alertaError}`}>{errorTareas ?? errorAsig}</p>}

      {cargando ? (
        <div className={`${ui.card} ${styles.cargando}`}>
          <span className={ui.spinner} aria-label="Cargando el horario" />
        </div>
      ) : sinTareas ? (
        <section className={`${ui.card} ${styles.vacio}`}>
          <h2 className={styles.h2}>{esAdmin ? "Arma la lista de tareas de la casa" : "Todavía no hay tareas"}</h2>
          <p className={styles.texto}>
            {esAdmin
              ? "Crea las tareas (sacar la basura, lavar los platos…), elige qué días se hacen y cuántos puntos valen. Después las repartes al azar o a mano."
              : "Cuando el admin del hogar cree las tareas y las reparta, aquí verás qué te toca cada día."}
          </p>
          {esAdmin && (
            <button
              type="button"
              className={`${ui.btn} ${ui.lg} ${ui.primario} ${styles.vacioBtn}`}
              onClick={() => setHoja({ tipo: "tarea", tarea: null })}
            >
              <PlusIcon size={20} />
              Crear la primera tarea
            </button>
          )}
        </section>
      ) : (
        <>
          <Calendario
            dias={dias}
            hoy={hoy}
            diaSel={diaSel}
            onDiaSel={setDiaSel}
            filtro={filtro}
            onFiltro={setFiltro}
            integrantes={integrantes}
            asignaciones={asignaciones}
            persona={persona}
            puedeMarcar={puedeMarcar}
            marcando={marcando}
            onAlternar={alternar}
            onAbrir={(a) => setHoja({ tipo: "asignacion", id: a.id })}
            hayTareas={tareas.some((t) => t.activa)}
            esAdmin={esAdmin}
          />

          <div className={styles.grid2}>
            {esSemanaActual && (
              <HoyEnCasa
                hoy={hoy}
                asignaciones={asignaciones.filter((a) => a.fecha === hoy)}
                persona={persona}
                puedeMarcar={puedeMarcar}
                marcando={marcando}
                onAlternar={alternar}
                onAbrir={(a) => setHoja({ tipo: "asignacion", id: a.id })}
              />
            )}
            <Cumplimiento integrantes={integrantes} asignaciones={asignaciones} />
          </div>

          {esAdmin && (
            <>
              <div className={styles.grid2}>
                <RepartirAzar dias={dias} hoy={hoy} onAviso={setAviso} />
                <AsignarTarea tareas={tareas} integrantes={integrantes} dias={dias} hoy={hoy} onAviso={setAviso} />
              </div>
              <ListaTareas tareas={tareas} persona={persona} onEditar={(t) => setHoja({ tipo: "tarea", tarea: t })} />
            </>
          )}
        </>
      )}

      <Sheet
        abierto={hoja?.tipo === "tarea"}
        onCerrar={() => setHoja(null)}
        titulo={hoja?.tipo === "tarea" && hoja.tarea ? "Editar tarea" : "Nueva tarea"}
      >
        {hoja?.tipo === "tarea" && (
          <TareaForm
            key={hoja.tarea?.id ?? "nueva"}
            tarea={hoja.tarea}
            integrantes={integrantes}
            hoy={hoy}
            onListo={(texto) => {
              setHoja(null);
              setAviso({ tipo: "ok", texto });
            }}
          />
        )}
      </Sheet>

      <Sheet abierto={!!asignacionAbierta} onCerrar={() => setHoja(null)} titulo={asignacionAbierta?.tarea ?? ""}>
        {asignacionAbierta && (
          <DetalleAsignacion
            key={asignacionAbierta.id}
            asignacion={asignacionAbierta}
            integrantes={integrantes}
            persona={persona}
            esAdmin={esAdmin}
            puedeMarcar={puedeMarcar(asignacionAbierta)}
            esFutura={asignacionAbierta.fecha > hoy}
            onListo={(texto) => {
              setHoja(null);
              if (texto) setAviso({ tipo: "ok", texto });
            }}
          />
        )}
      </Sheet>
    </>
  );
}
