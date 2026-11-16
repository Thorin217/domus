"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Star } from "@/components/Icons";
import type { Fila } from "./PremiosPanel";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

/** Puede recibir una propuesta de castigo de parte de `yo`. */
export function puedeCastigar(f: Fila, yo: string, esAdmin: boolean) {
  return f.uid !== yo && !f.castigo && (f.estado === "castigo" || esAdmin);
}

export function EstadoBadge({ fila }: { fila: Fila }) {
  const canjeAprobado = fila.canjes.some((v) => v.estado === "aprobada");
  const canjeAbierto = fila.canjes.some((v) => v.estado === "abierta");
  let tono: string | undefined;
  let texto: string;
  if (fila.castigo) {
    tono = "mal";
    texto = fila.castigo.estado === "abierta" ? "Castigo en votación" : "Castigo aprobado";
  } else if (canjeAbierto) {
    tono = "azul";
    texto = "Canje en votación";
  } else if (canjeAprobado) {
    tono = "azul";
    texto = "Premio canjeado";
  } else if (fila.estado === "premio") {
    tono = "ok";
    texto = "Premio disponible";
  } else if (fila.estado === "castigo") {
    tono = "mal";
    texto = "Bajo el promedio";
  } else if (fila.estado === "normal") {
    texto = "En camino";
  } else {
    texto = "Sin notas";
  }
  return (
    <span className={styles.badge} data-tono={tono}>
      {texto}
    </span>
  );
}

export function Clasificacion({
  filas,
  titulo,
  yo,
  esAdmin,
  hayCastigos,
  onCastigo,
}: {
  filas: Fila[];
  titulo: string;
  yo: string;
  esAdmin: boolean;
  hayCastigos: boolean;
  onCastigo: (uid: string) => void;
}) {
  return (
    <section className={ui.card} aria-labelledby="t-clasif">
      <h2 id="t-clasif" className={styles.h2}>
        {titulo}
      </h2>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Integrante</th>
            <th scope="col" className={styles.num}>
              Puntos
            </th>
            <th scope="col" className={styles.num}>
              Promedio
            </th>
            <th scope="col" className={styles.colEstado}>
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const castigar = hayCastigos && puedeCastigar(f, yo, esAdmin) && f.estado === "castigo";
            return (
              <tr key={f.uid}>
                <td>{i + 1}</td>
                <td>
                  <div className={styles.persona}>
                    <Avatar nombre={f.nombre} color={f.color} size={32} />
                    <div className={styles.personaTexto}>
                      <span className={styles.personaNombre}>
                        {f.nombre}
                        {f.uid === yo && <span className={ui.srOnly}> (tú)</span>}
                      </span>
                      <span className={styles.saldo}>Saldo: {f.saldo} pts</span>
                      <span className={styles.estadoMovil}>
                        <EstadoBadge fila={f} />
                      </span>
                      {castigar && (
                        <button type="button" className={`${ui.btn} ${ui.secundario} ${styles.accionFila}`} onClick={() => onCastigo(f.uid)}>
                          Proponer castigo
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className={styles.num}>{f.ptsSemana}</td>
                <td className={styles.num}>
                  {f.promedio === null ? (
                    <span className={styles.saldo} title="Todavía nadie calificó sus tareas">
                      —
                    </span>
                  ) : (
                    <span className={styles.promedio} title={`${f.notas} ${f.notas === 1 ? "nota" : "notas"}`}>
                      <Star filled size={16} />
                      {f.promedio.toFixed(1)}
                    </span>
                  )}
                </td>
                <td className={styles.colEstado}>
                  <EstadoBadge fila={f} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.nota}>
        Los puntos de la semana salen de las tareas hechas; el saldo es lo acumulado para canjear premios.
      </p>
    </section>
  );
}
