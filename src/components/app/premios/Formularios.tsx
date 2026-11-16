"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import type { Integrante } from "@/lib/hogar/types";
import { LIMITES_PREMIOS, aCentavos, dinero, type ItemCatalogo, type Reglas, type TipoItem } from "@/lib/premios/types";
import { Avatar } from "@/components/ui/Avatar";
import { AlertIcon } from "@/components/Icons";
import { puedeCastigar } from "./Clasificacion";
import type { Fila } from "./PremiosPanel";
import ui from "@/components/ui/ui.module.css";
import styles from "./premios.module.css";

function useEnvio() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function enviar(fn: () => Promise<void>) {
    setError(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      setOcupado(false);
    }
  }
  return { ocupado, error, setError, enviar };
}

function Pie({ ocupado, error, texto }: { ocupado: boolean; error: string | null; texto: string }) {
  return (
    <>
      {error && (
        <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={`${ui.btn} ${ui.lg} ${ui.primario} ${ui.block}`} disabled={ocupado}>
        {ocupado ? <span className={ui.spinner} aria-label="Guardando" /> : texto}
      </button>
    </>
  );
}

function Campo({ id, label, ayuda, children }: { id?: string; label: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className={ui.field}>
      {id ? (
        <label className={ui.label} htmlFor={id}>
          {label}
        </label>
      ) : (
        <span className={ui.label}>{label}</span>
      )}
      {children}
      {ayuda && <span className={ui.ayuda}>{ayuda}</span>}
    </div>
  );
}

// ---------- Proponer premio o castigo ----------

export function ProponerForm({ conVoto, onListo }: { conVoto: boolean; onListo: (msg: string) => void }) {
  const [tipo, setTipo] = useState<TipoItem>("premio");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [puntos, setPuntos] = useState("50");
  const [multa, setMulta] = useState("");
  const { ocupado, error, setError, enviar } = useEnvio();

  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("Escribe el nombre.");
    const pts = Number(puntos);
    if (tipo === "premio" && (!Number.isInteger(pts) || pts < 1 || pts > LIMITES_PREMIOS.puntosMax)) {
      return setError(`Los puntos van de 1 a ${LIMITES_PREMIOS.puntosMax}.`);
    }
    const monto = tipo === "castigo" && multa.trim() ? aCentavos(multa) : null;
    if (tipo === "castigo" && multa.trim() && (!monto || monto > LIMITES_PREMIOS.montoMax)) {
      return setError("Escribe la multa en dólares, por ejemplo 1 o 2.50.");
    }
    enviar(async () => {
      const r = await api<{ estado: string }>("/api/hogar/catalogo", {
        body: { tipo, nombre, descripcion, puntos: tipo === "premio" ? pts : null, monto },
      });
      onListo(
        r.estado === "aprobada"
          ? `“${nombre.trim()}” ya está en la lista.`
          : `Propusiste “${nombre.trim()}”. Ahora la familia vota.`,
      );
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <div className={ui.segmented} role="group" aria-label="Tipo">
        <button type="button" className={ui.segment} aria-pressed={tipo === "premio"} onClick={() => setTipo("premio")}>
          Premio
        </button>
        <button type="button" className={ui.segment} aria-pressed={tipo === "castigo"} onClick={() => setTipo("castigo")}>
          Castigo
        </button>
      </div>
      <Campo id="p-nombre" label="Nombre">
        <input
          id="p-nombre"
          className={ui.input}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={LIMITES_PREMIOS.nombre}
          placeholder={tipo === "premio" ? "Ej. Noche de pizza" : "Ej. Lavar los platos 2 días"}
          autoComplete="off"
        />
      </Campo>
      <Campo id="p-desc" label="Descripción (opcional)">
        <input
          id="p-desc"
          className={ui.input}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={LIMITES_PREMIOS.descripcion}
          placeholder={tipo === "premio" ? "Ej. Elige el sabor para todos." : "Ej. Para quien baje del promedio."}
          autoComplete="off"
        />
      </Campo>
      {tipo === "premio" ? (
        <Campo id="p-puntos" label="Cuesta (puntos)" ayuda="Se descuentan del saldo de quien lo canjea.">
          <input
            id="p-puntos"
            className={ui.input}
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITES_PREMIOS.puntosMax}
            value={puntos}
            onChange={(e) => setPuntos(e.target.value)}
          />
        </Campo>
      ) : (
        <Campo id="p-multa" label="Multa en dólares (opcional)" ayuda="Va al fondo familiar para gastarlo juntos. Déjalo vacío si no hay multa.">
          <input
            id="p-multa"
            className={ui.input}
            inputMode="decimal"
            value={multa}
            onChange={(e) => setMulta(e.target.value)}
            placeholder="Ej. 1"
            autoComplete="off"
          />
        </Campo>
      )}
      <p className={styles.nota}>
        {conVoto ? "La familia vota antes de agregarlo a la lista." : "Se agrega directo a la lista."}
      </p>
      <Pie ocupado={ocupado} error={error} texto={conVoto ? "Proponer a la familia" : "Agregar"} />
    </form>
  );
}

// ---------- Proponer castigo a alguien ----------

export function CastigoForm({
  inicial,
  castigos,
  filas,
  yo,
  esAdmin,
  semana,
  reglas,
  onListo,
}: {
  inicial: { itemId?: string; uid?: string };
  castigos: ItemCatalogo[];
  filas: Fila[];
  yo: string;
  esAdmin: boolean;
  semana: string;
  reglas: Reglas;
  onListo: (msg: string) => void;
}) {
  const candidatos = filas.filter((f) => puedeCastigar(f, yo, esAdmin));
  const [uid, setUid] = useState(inicial.uid ?? (candidatos.length === 1 ? candidatos[0].uid : ""));
  const [itemId, setItemId] = useState(inicial.itemId ?? (castigos.length === 1 ? castigos[0].id : ""));
  const { ocupado, error, setError, enviar } = useEnvio();

  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!uid) return setError("Elige a quién.");
    if (!itemId) return setError("Elige el castigo.");
    const quien = filas.find((f) => f.uid === uid)?.nombre ?? "";
    enviar(async () => {
      const r = await api<{ estado: string }>("/api/hogar/votaciones", { body: { tipo: "castigo", itemId, uid, semana } });
      onListo(r.estado === "aprobada" ? `Se aprobó el castigo para ${quien}.` : `Propusiste un castigo para ${quien}. Ahora la familia vota.`);
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <Campo label="¿Para quién?" ayuda={esAdmin ? undefined : `Solo quien quedó bajo ${reglas.umbralCastigo.toFixed(1)} ★ de promedio.`}>
        {candidatos.length ? (
          <ul className={styles.opciones}>
            {candidatos.map((f) => (
              <li key={f.uid}>
                <button type="button" className={styles.opcion} aria-pressed={uid === f.uid} onClick={() => setUid(f.uid)}>
                  <Avatar nombre={f.nombre} color={f.color} size={32} />
                  <span className={styles.opcionTexto}>
                    <b>{f.nombre}</b>
                    <span className={styles.saldo}>{f.promedio === null ? "Sin notas" : `Promedio ${f.promedio.toFixed(1)} ★`}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.nota}>Nadie está bajo el promedio esta semana.</p>
        )}
      </Campo>
      <Campo label="Castigo">
        <ul className={styles.opciones}>
          {castigos.map((c) => (
            <li key={c.id}>
              <button type="button" className={styles.opcion} aria-pressed={itemId === c.id} onClick={() => setItemId(c.id)}>
                <span className={styles.itemIcon} data-tipo="castigo" aria-hidden="true">
                  <AlertIcon size={20} />
                </span>
                <span className={styles.opcionTexto}>
                  <b>{c.nombre}</b>
                  <span className={styles.saldo}>{c.monto ? `Multa de ${dinero(c.monto)} al fondo` : "Sin multa"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Campo>
      <Pie ocupado={ocupado} error={error} texto="Proponer a la familia" />
    </form>
  );
}

// ---------- Aporte o gasto del fondo ----------

export function MovimientoForm({
  tipo,
  reglas,
  saldo,
  integrantes,
  onListo,
}: {
  tipo: "aporte" | "gasto";
  reglas: Reglas;
  saldo: number;
  integrantes: Integrante[];
  onListo: (msg: string) => void;
}) {
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [uid, setUid] = useState("");
  const { ocupado, error, setError, enviar } = useEnvio();

  function guardar(e: FormEvent) {
    e.preventDefault();
    const centavos = aCentavos(monto);
    if (!centavos) return setError("Escribe el monto en dólares, por ejemplo 25 o 12.50.");
    if (tipo === "gasto" && centavos > saldo) return setError(`En el fondo hay ${dinero(saldo)}.`);
    if (!descripcion.trim()) return setError(tipo === "gasto" ? "Escribe en qué se gastó." : "Escribe una descripción.");
    enviar(async () => {
      const r = await api<{ estado: string }>("/api/hogar/fondo", { body: { tipo, monto: centavos, descripcion, uid: uid || null } });
      onListo(
        r.estado === "abierta"
          ? `La familia vota si gastar ${dinero(centavos)} del fondo.`
          : tipo === "gasto"
            ? `Se registró el gasto de ${dinero(centavos)}.`
            : `Entraron ${dinero(centavos)} al fondo.`,
      );
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <p className={styles.nota}>
        {reglas.fondoNombre}: hay <b>{dinero(saldo)}</b>.
        {tipo === "gasto" && reglas.gastoConVoto && " El gasto se hace cuando la familia lo aprueba."}
      </p>
      <div className={styles.fila2}>
        <Campo id="m-monto" label="Monto (USD)">
          <input
            id="m-monto"
            className={ui.input}
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej. 25"
            autoComplete="off"
          />
        </Campo>
        {tipo === "aporte" && (
          <Campo id="m-uid" label="¿Quién aporta? (opcional)">
            <select id="m-uid" className={ui.input} value={uid} onChange={(e) => setUid(e.target.value)}>
              <option value="">La familia</option>
              {integrantes.map((i) => (
                <option key={i.uid} value={i.uid}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>
      <Campo id="m-desc" label={tipo === "gasto" ? "¿En qué se gastó?" : "Descripción"}>
        <input
          id="m-desc"
          className={ui.input}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={LIMITES_PREMIOS.descripcion}
          placeholder={tipo === "gasto" ? "Ej. Cena en familia" : "Ej. Lo que sobró de la semana"}
          autoComplete="off"
        />
      </Campo>
      <Pie
        ocupado={ocupado}
        error={error}
        texto={tipo === "gasto" ? (reglas.gastoConVoto ? "Proponer gasto a la familia" : "Registrar gasto") : "Registrar aporte"}
      />
    </form>
  );
}

// ---------- Reglas (admin) ----------

export function ReglasForm({ reglas, onListo }: { reglas: Reglas; onListo: (msg: string) => void }) {
  const [premio, setPremio] = useState(String(reglas.umbralPremio));
  const [castigo, setCastigo] = useState(String(reglas.umbralCastigo));
  const [votacion, setVotacion] = useState(reglas.votacion);
  const [noHecho, setNoHecho] = useState(reglas.noHechoCuentaComoUno);
  const [canjes, setCanjes] = useState(String(reglas.canjesPorSemana));
  const [catalogoConVoto, setCatalogoConVoto] = useState(reglas.catalogoConVoto);
  const [gastoConVoto, setGastoConVoto] = useState(reglas.gastoConVoto);
  const [fondoNombre, setFondoNombre] = useState(reglas.fondoNombre);
  const [meta, setMeta] = useState(reglas.fondoMeta ? String(reglas.fondoMeta / 100) : "");
  const { ocupado, error, setError, enviar } = useEnvio();

  function guardar(e: FormEvent) {
    e.preventDefault();
    const up = Number(premio.replace(",", "."));
    const uc = Number(castigo.replace(",", "."));
    const nc = Number(canjes);
    if (!(up >= 1 && up <= 5) || !(uc >= 1 && uc <= 5)) return setError("Los promedios van de 1 a 5.");
    if (uc >= up) return setError("El promedio para castigo debe ser menor que el de premio.");
    if (!Number.isInteger(nc) || nc < 0 || nc > LIMITES_PREMIOS.canjesMax) return setError(`Los canjes por semana van de 0 a ${LIMITES_PREMIOS.canjesMax}.`);
    const fondoMeta = meta.trim() ? aCentavos(meta) : null;
    if (meta.trim() && !fondoMeta) return setError("Escribe la meta en dólares, por ejemplo 100.");
    enviar(async () => {
      await api("/api/hogar/reglas", {
        method: "PATCH",
        body: {
          umbralPremio: Math.round(up * 10) / 10,
          umbralCastigo: Math.round(uc * 10) / 10,
          votacion,
          noHechoCuentaComoUno: noHecho,
          canjesPorSemana: nc,
          catalogoConVoto,
          gastoConVoto,
          fondoNombre,
          fondoMeta,
        },
      });
      onListo("Reglas guardadas.");
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <div className={styles.fila2}>
        <Campo id="r-premio" label="Promedio para premio" ayuda="Desde este promedio se puede canjear.">
          <input id="r-premio" className={ui.input} inputMode="decimal" value={premio} onChange={(e) => setPremio(e.target.value)} />
        </Campo>
        <Campo id="r-castigo" label="Promedio para castigo" ayuda="Por debajo, se puede proponer un castigo.">
          <input id="r-castigo" className={ui.input} inputMode="decimal" value={castigo} onChange={(e) => setCastigo(e.target.value)} />
        </Campo>
      </div>
      <Campo label="¿Cómo se aprueba?">
        <div className={ui.segmented} role="group" aria-label="Cómo se aprueba">
          <button type="button" className={ui.segment} aria-pressed={votacion === "mayoria"} onClick={() => setVotacion("mayoria")}>
            Por mayoría
          </button>
          <button type="button" className={ui.segment} aria-pressed={votacion === "todos"} onClick={() => setVotacion("todos")}>
            Todos de acuerdo
          </button>
        </div>
      </Campo>
      <Campo id="r-canjes" label="Premios por semana" ayuda="Cuántos premios puede canjear cada quien por semana (0 = ninguno).">
        <input
          id="r-canjes"
          className={`${ui.input}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={LIMITES_PREMIOS.canjesMax}
          value={canjes}
          onChange={(e) => setCanjes(e.target.value)}
        />
      </Campo>
      <label className={styles.check}>
        <input type="checkbox" checked={noHecho} onChange={(e) => setNoHecho(e.target.checked)} />
        <span>Una tarea marcada “no se hizo” cuenta como 1 ★ en el promedio</span>
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={catalogoConVoto} onChange={(e) => setCatalogoConVoto(e.target.checked)} />
        <span>Cualquiera propone premios y castigos, y la familia vota (si no, solo tú los agregas)</span>
      </label>

      <h3 className={styles.calTarea}>Fondo familiar</h3>
      <div className={styles.fila2}>
        <Campo id="r-fondo" label="Nombre del fondo">
          <input
            id="r-fondo"
            className={ui.input}
            value={fondoNombre}
            onChange={(e) => setFondoNombre(e.target.value)}
            maxLength={LIMITES_PREMIOS.nombre}
          />
        </Campo>
        <Campo id="r-meta" label="Meta en dólares (opcional)">
          <input id="r-meta" className={ui.input} inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ej. 100" />
        </Campo>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={gastoConVoto} onChange={(e) => setGastoConVoto(e.target.checked)} />
        <span>Gastar del fondo requiere votación de la familia</span>
      </label>
      <Pie ocupado={ocupado} error={error} texto="Guardar reglas" />
    </form>
  );
}

// ---------- Acusar a alguien ----------

export function AcusarForm({
  castigos,
  integrantes,
  yo,
  onListo,
}: {
  castigos: ItemCatalogo[];
  integrantes: Integrante[];
  yo: string;
  onListo: (msg: string) => void;
}) {
  const otros = integrantes.filter((i) => i.uid !== yo);
  const [uid, setUid] = useState(otros.length === 1 ? otros[0].uid : "");
  const [motivo, setMotivo] = useState("");
  const [itemId, setItemId] = useState(castigos.length === 1 ? castigos[0].id : "");
  const { ocupado, error, setError, enviar } = useEnvio();

  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!uid) return setError("Elige a quién acusas.");
    if (!motivo.trim()) return setError("Cuenta qué pasó.");
    if (!itemId) return setError("Elige el castigo que propones.");
    const quien = otros.find((i) => i.uid === uid)?.nombre ?? "";
    enviar(async () => {
      await api("/api/hogar/votaciones", { body: { tipo: "acusacion", uid, motivo, itemId } });
      onListo(`Acusaste a ${quien}. Tiene 48 horas para defenderse; después la familia decide.`);
    });
  }

  if (!castigos.length) {
    return <p className={styles.nota}>Primero la familia tiene que aprobar al menos un castigo en el catálogo.</p>;
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <Campo label="¿A quién acusas?">
        <ul className={styles.opciones}>
          {otros.map((i) => (
            <li key={i.uid}>
              <button type="button" className={styles.opcion} aria-pressed={uid === i.uid} onClick={() => setUid(i.uid)}>
                <Avatar nombre={i.nombre} color={i.color} size={32} />
                <span className={styles.opcionTexto}>
                  <b>{i.nombre}</b>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Campo>
      <Campo id="a-motivo" label="¿Qué pasó?" ayuda="Sé concreto: la persona acusada lo va a leer y podrá defenderse.">
        <textarea
          id="a-motivo"
          className={`${ui.input} ${styles.textarea}`}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={LIMITES_PREMIOS.motivo}
          placeholder="Ej. Dejó los platos sucios toda la noche."
        />
      </Campo>
      <Campo label="Castigo que propones">
        <ul className={styles.opciones}>
          {castigos.map((c) => (
            <li key={c.id}>
              <button type="button" className={styles.opcion} aria-pressed={itemId === c.id} onClick={() => setItemId(c.id)}>
                <span className={styles.itemIcon} data-tipo="castigo" aria-hidden="true">
                  <AlertIcon size={20} />
                </span>
                <span className={styles.opcionTexto}>
                  <b>{c.nombre}</b>
                  <span className={styles.saldo}>{c.monto ? `Multa de ${dinero(c.monto)} al fondo` : "Sin multa"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Campo>
      <p className={styles.nota}>Tu voto cuenta a favor. Se decide cuando la persona se defienda o acepte, o cuando pasen 48 horas.</p>
      <Pie ocupado={ocupado} error={error} texto="Acusar" />
    </form>
  );
}
