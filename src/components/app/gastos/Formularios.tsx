"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import type { Integrante } from "@/lib/hogar/types";
import { DIAS_NOMBRE, diaSemana, sumarDias } from "@/lib/quehaceres/types";
import {
  LIMITES_GASTOS,
  leerMonto,
  mesDe,
  moneda,
  nombreMes,
  type Categoria,
  type Compra,
  type FijoDelMes,
  type GastoFijo,
  type Presupuesto,
  type TipoCompra,
} from "@/lib/gastos/types";
import { XMarkIcon } from "@/components/Icons";
import ui from "@/components/ui/ui.module.css";
import styles from "./gastos.module.css";

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

function MensajeError({ error }: { error: string | null }) {
  return error ? (
    <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
      {error}
    </p>
  ) : null;
}

function Enviar({ ocupado, texto }: { ocupado: boolean; texto: string }) {
  return (
    <button type="submit" className={`${ui.btn} ${ui.lg} ${ui.primario} ${ui.block}`} disabled={ocupado}>
      {ocupado ? <span className={ui.spinner} aria-label="Guardando" /> : texto}
    </button>
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

function MontoInput({ id, valor, onCambio, placeholder }: { id: string; valor: string; onCambio: (v: string) => void; placeholder?: string }) {
  return (
    <div className={styles.monedaInput}>
      <span aria-hidden="true">$</span>
      <input
        id={id}
        className={ui.input}
        inputMode="decimal"
        value={valor}
        onChange={(e) => onCambio(e.target.value.replace(/[^\d.,]/g, ""))}
        placeholder={placeholder ?? "0.00"}
        autoComplete="off"
      />
    </div>
  );
}

const centavosATexto = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace(/\.00$/, "") : "");

// ---------- Compra ----------

export function CompraForm({
  compra,
  categorias,
  integrantes,
  yo,
  hoy,
  onListo,
}: {
  compra: Compra | null;
  categorias: Categoria[];
  integrantes: Integrante[];
  yo: string;
  hoy: string;
  onListo: (msg: string) => void;
}) {
  const [concepto, setConcepto] = useState(compra?.concepto ?? "");
  const [monto, setMonto] = useState(centavosATexto(compra?.monto));
  const [categoria, setCategoria] = useState(compra?.categoria ?? categorias[0]?.id ?? "");
  const [fecha, setFecha] = useState(compra?.fecha ?? hoy);
  const [pagadoPor, setPagadoPor] = useState(compra?.pagadoPor ?? yo);
  const [tipo, setTipo] = useState<TipoCompra>(compra?.tipo ?? "familiar");
  const [borrar, setBorrar] = useState(false);
  const { ocupado, error, setError, enviar } = useEnvio();
  const esFijo = !!compra?.gastoFijoId;
  // Si la categoría se quitó de la lista, se conserva para no perderla al editar.
  const opciones = categorias.some((c) => c.id === categoria) || !categoria ? categorias : [...categorias, { id: categoria, nombre: "Otra" }];

  function guardar(e: FormEvent) {
    e.preventDefault();
    const centavos = leerMonto(monto);
    if (!concepto.trim()) return setError("Escribe qué compraste.");
    if (!centavos) return setError("Escribe el monto, por ejemplo 48.20.");
    if (!fecha) return setError("Elige la fecha.");
    if (fecha > sumarDias(hoy, 1)) return setError("La fecha no puede ser del futuro.");
    if (esFijo && mesDe(fecha) !== compra!.mes) return setError(`El pago tiene que quedar en ${nombreMes(compra!.mes)}.`);
    enviar(async () => {
      const body = { concepto, monto: centavos, categoria, fecha, pagadoPor, tipo };
      if (compra) await api(`/api/hogar/compras/${compra.id}`, { method: "PATCH", body });
      else await api("/api/hogar/compras", { body });
      onListo(compra ? "Compra actualizada." : `Anotado: ${concepto.trim()}, ${moneda(centavos)}.`);
    });
  }

  function eliminar() {
    if (!compra) return;
    if (!borrar) return setBorrar(true);
    enviar(async () => {
      await api(`/api/hogar/compras/${compra.id}`, { method: "DELETE" });
      onListo(esFijo ? `${compra.concepto} vuelve a quedar por pagar.` : `Se borró “${compra.concepto}”.`);
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      {!esFijo && (
        <div className={ui.segmented} role="group" aria-label="Tipo de compra">
          <button type="button" className={ui.segment} aria-pressed={tipo === "familiar"} onClick={() => setTipo("familiar")}>
            Familiar
          </button>
          <button type="button" className={ui.segment} aria-pressed={tipo === "personal"} onClick={() => setTipo("personal")}>
            Personal
          </button>
        </div>
      )}
      <Campo id="c-concepto" label="Concepto">
        <input
          id="c-concepto"
          className={ui.input}
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          maxLength={LIMITES_GASTOS.concepto}
          placeholder="Ej. Súper La Despensa"
          autoComplete="off"
        />
      </Campo>
      <div className={styles.fila2}>
        <Campo id="c-monto" label="Monto (USD)">
          <MontoInput id="c-monto" valor={monto} onCambio={setMonto} />
        </Campo>
        <Campo id="c-fecha" label="Fecha">
          <input id="c-fecha" className={ui.input} type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
      </div>
      <div className={styles.fila2}>
        <Campo id="c-cat" label="Categoría">
          <select id="c-cat" className={ui.input} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {opciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="c-pago" label="¿Quién pagó?">
          <select id="c-pago" className={ui.input} value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value)}>
            {integrantes.map((i) => (
              <option key={i.uid} value={i.uid}>
                {i.uid === yo ? `${i.nombre} (yo)` : i.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <p className={styles.nota}>
        {esFijo
          ? "Es el pago de un gasto fijo: cuenta en el presupuesto del hogar."
          : tipo === "familiar"
            ? "Familiar: cuenta en el presupuesto del hogar."
            : "Personal: la familia la ve, pero no descuenta del presupuesto del hogar."}
      </p>
      <MensajeError error={error} />
      <Enviar ocupado={ocupado} texto={compra ? "Guardar cambios" : "Agregar compra"} />
      {compra && (
        <button type="button" className={`${ui.btn} ${ui.lg} ${ui.peligro} ${ui.block}`} onClick={eliminar} disabled={ocupado}>
          {borrar ? "Toca otra vez para confirmar" : esFijo ? "Deshacer el pago" : "Borrar compra"}
        </button>
      )}
    </form>
  );
}

// ---------- Presupuesto y categorías (admin) ----------

type FilaCat = { id?: string; nombre: string; tope: string; clave: number };

export function PresupuestoForm({
  presupuesto,
  categorias,
  onListo,
}: {
  presupuesto: Presupuesto;
  categorias: Categoria[];
  onListo: (msg: string) => void;
}) {
  const [total, setTotal] = useState(centavosATexto(presupuesto.total));
  const [filas, setFilas] = useState<FilaCat[]>(() =>
    categorias.map((c, i) => ({ id: c.id, nombre: c.nombre, tope: centavosATexto(presupuesto.porCategoria[c.id]), clave: i })),
  );
  const { ocupado, error, setError, enviar } = useEnvio();

  const cambiar = (clave: number, campo: "nombre" | "tope", v: string) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, [campo]: campo === "tope" ? v.replace(/[^\d.,]/g, "") : v } : f)));

  function guardar(e: FormEvent) {
    e.preventDefault();
    const t = total.trim() ? leerMonto(total) : null;
    if (total.trim() && (!t || t < 100)) return setError("Escribe el presupuesto en dólares, por ejemplo 1800.");
    const cats: { id?: string; nombre: string; tope: number | null }[] = [];
    for (const f of filas) {
      if (!f.nombre.trim()) return setError("Cada categoría necesita un nombre (o quítala).");
      const tope = f.tope.trim() ? leerMonto(f.tope) : null;
      if (f.tope.trim() && (!tope || tope < 100)) return setError(`El tope de “${f.nombre}” no es válido.`);
      cats.push({ id: f.id, nombre: f.nombre, tope });
    }
    if (!cats.length) return setError("Deja al menos una categoría.");
    const sumaTopes = cats.reduce((s, c) => s + (c.tope ?? 0), 0);
    if (t && sumaTopes > t) return setError(`Los topes por categoría suman ${moneda(sumaTopes)}, más que el total.`);
    enviar(async () => {
      await api("/api/hogar/presupuesto", { method: "PATCH", body: { total: t, categorias: cats } });
      onListo("Presupuesto guardado.");
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <Campo
        id="p-total"
        label="Presupuesto mensual del hogar"
        ayuda="Cuentan las compras familiares y los gastos fijos. Déjalo vacío si no quieren usar presupuesto."
      >
        <MontoInput id="p-total" valor={total} onCambio={setTotal} placeholder="1800" />
      </Campo>

      <div className={ui.field}>
        <span className={ui.label}>Categorías y topes (opcional)</span>
        <div className={styles.categoriasHead} aria-hidden="true">
          <span>Nombre</span>
          <span>Tope al mes</span>
          <span />
        </div>
        <ul className={styles.categorias}>
          {filas.map((f) => (
            <li key={f.clave} className={styles.categoria}>
              <input
                className={ui.input}
                value={f.nombre}
                onChange={(e) => cambiar(f.clave, "nombre", e.target.value)}
                maxLength={LIMITES_GASTOS.categoria}
                aria-label="Nombre de la categoría"
              />
              <div className={styles.monedaInput}>
                <span aria-hidden="true">$</span>
                <input
                  className={ui.input}
                  inputMode="decimal"
                  value={f.tope}
                  onChange={(e) => cambiar(f.clave, "tope", e.target.value)}
                  placeholder="—"
                  aria-label={`Tope de ${f.nombre || "la categoría"}`}
                />
              </div>
              <button
                type="button"
                className={`${ui.btn} ${ui.iconBtn} ${styles.iconBtn}`}
                onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
                aria-label={`Quitar ${f.nombre || "categoría"}`}
                disabled={filas.length === 1}
              >
                <XMarkIcon size={18} />
              </button>
            </li>
          ))}
        </ul>
        {filas.length < LIMITES_GASTOS.categoriasMax && (
          <button
            type="button"
            className={`${ui.btn} ${ui.azul}`}
            style={{ alignSelf: "flex-start" }}
            onClick={() => setFilas((fs) => [...fs, { nombre: "", tope: "", clave: Math.max(0, ...fs.map((x) => x.clave)) + 1 }])}
          >
            Agregar categoría
          </button>
        )}
        <span className={ui.ayuda}>Al quitar una categoría, las compras que ya la usaban se muestran como “Otra”.</span>
      </div>
      <MensajeError error={error} />
      <Enviar ocupado={ocupado} texto="Guardar presupuesto" />
    </form>
  );
}

// ---------- Gasto fijo (admin) ----------

export function FijoForm({
  fijo,
  categorias,
  mes,
  onListo,
}: {
  fijo: GastoFijo | null;
  categorias: Categoria[];
  mes: string;
  onListo: (msg: string) => void;
}) {
  const [nombre, setNombre] = useState(fijo?.nombre ?? "");
  const [monto, setMonto] = useState(centavosATexto(fijo?.monto));
  const [categoria, setCategoria] = useState(fijo?.categoria ?? categorias.find((c) => c.id === "vivienda")?.id ?? categorias[0]?.id ?? "");
  const [dia, setDia] = useState(String(fijo?.dia ?? 1));
  const [aviso, setAviso] = useState(String(fijo?.avisoDias ?? 3));
  const [activo, setActivo] = useState(fijo?.activo ?? true);
  const [borrar, setBorrar] = useState(false);
  const { ocupado, error, setError, enviar } = useEnvio();

  function guardar(e: FormEvent) {
    e.preventDefault();
    const centavos = leerMonto(monto);
    const d = Number(dia);
    const a = Number(aviso);
    if (!nombre.trim()) return setError("Escribe el nombre, por ejemplo Alquiler.");
    if (!centavos) return setError("Escribe el monto de cada mes.");
    if (!Number.isInteger(d) || d < 1 || d > 31) return setError("El día de vencimiento va de 1 a 31.");
    if (!Number.isInteger(a) || a < 0 || a > LIMITES_GASTOS.avisoMax) return setError(`El aviso va de 0 a ${LIMITES_GASTOS.avisoMax} días.`);
    enviar(async () => {
      const body = { nombre, monto: centavos, categoria, dia: d, avisoDias: a };
      if (fijo) await api(`/api/hogar/gastos-fijos/${fijo.id}`, { method: "PATCH", body: { ...body, activo } });
      else await api("/api/hogar/gastos-fijos", { body: { ...body, desde: mes } });
      onListo(fijo ? "Gasto fijo actualizado." : `${nombre.trim()} se agregó: vence cada día ${d}.`);
    });
  }

  function eliminar() {
    if (!fijo) return;
    if (!borrar) return setBorrar(true);
    enviar(async () => {
      await api(`/api/hogar/gastos-fijos/${fijo.id}`, { method: "DELETE" });
      onListo(`Se eliminó ${fijo.nombre}. Los pagos ya hechos quedan en las compras.`);
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <Campo id="f-nombre" label="Nombre">
        <input
          id="f-nombre"
          className={ui.input}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={LIMITES_GASTOS.concepto}
          placeholder="Ej. Alquiler, Luz, Internet"
          autoComplete="off"
        />
      </Campo>
      <div className={styles.fila2}>
        <Campo id="f-monto" label="Monto de cada mes" ayuda="Si varía (como la luz), pon un aproximado: al pagarlo se anota el real.">
          <MontoInput id="f-monto" valor={monto} onCambio={setMonto} />
        </Campo>
        <Campo id="f-cat" label="Categoría">
          <select id="f-cat" className={ui.input} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className={styles.fila2}>
        <Campo id="f-dia" label="Vence el día" ayuda="Si el mes es más corto, vence el último día.">
          <input id="f-dia" className={ui.input} type="number" inputMode="numeric" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} />
        </Campo>
        <Campo id="f-aviso" label="Avisar días antes">
          <input
            id="f-aviso"
            className={ui.input}
            type="number"
            inputMode="numeric"
            min={0}
            max={LIMITES_GASTOS.avisoMax}
            value={aviso}
            onChange={(e) => setAviso(e.target.value)}
          />
        </Campo>
      </div>
      {fijo ? (
        <label className={styles.compraMeta} style={{ fontSize: 15, color: "var(--text)", minHeight: 44, gap: 10 }}>
          <input type="checkbox" checked={!activo} onChange={(e) => setActivo(!e.target.checked)} style={{ width: 20, height: 20 }} />
          Pausarlo (ya no cuenta en los próximos meses)
        </label>
      ) : (
        <p className={styles.nota}>Empieza a contar desde {nombreMes(mes)}.</p>
      )}
      <MensajeError error={error} />
      <Enviar ocupado={ocupado} texto={fijo ? "Guardar cambios" : "Agregar gasto fijo"} />
      {fijo && (
        <button type="button" className={`${ui.btn} ${ui.lg} ${ui.peligro} ${ui.block}`} onClick={eliminar} disabled={ocupado}>
          {borrar ? "Toca otra vez para eliminarlo" : "Eliminar gasto fijo"}
        </button>
      )}
    </form>
  );
}

// ---------- Pagar un gasto fijo ----------

export function PagarFijoForm({
  f,
  mes,
  hoy,
  integrantes,
  yo,
  onListo,
}: {
  f: FijoDelMes;
  mes: string;
  hoy: string;
  integrantes: Integrante[];
  yo: string;
  onListo: (msg: string) => void;
}) {
  const [monto, setMonto] = useState(centavosATexto(f.fijo.monto));
  // Fecha del pago: hoy si es este mes; si es un mes pasado, el vencimiento.
  const [fecha, setFecha] = useState(mesDe(hoy) === mes ? hoy : f.vence);
  const [pagadoPor, setPagadoPor] = useState(yo);
  const { ocupado, error, setError, enviar } = useEnvio();

  function guardar(e: FormEvent) {
    e.preventDefault();
    const centavos = leerMonto(monto);
    if (!centavos) return setError("Escribe cuánto se pagó.");
    if (mesDe(fecha) !== mes) return setError(`La fecha tiene que ser de ${nombreMes(mes)}.`);
    if (fecha > sumarDias(hoy, 1)) return setError("La fecha no puede ser del futuro.");
    enviar(async () => {
      await api(`/api/hogar/gastos-fijos/${f.fijo.id}/pagar`, { body: { mes, monto: centavos, fecha, pagadoPor } });
      onListo(`${f.fijo.nombre} de ${nombreMes(mes, false)}: pagado (${moneda(centavos)}).`);
    });
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <p className={styles.nota}>
        Vence el {DIAS_NOMBRE[diaSemana(f.vence)]} {Number(f.vence.slice(8))} de {nombreMes(mes, false)}. Queda anotado como compra
        familiar del mes.
      </p>
      <div className={styles.fila2}>
        <Campo id="pg-monto" label="Monto pagado">
          <MontoInput id="pg-monto" valor={monto} onCambio={setMonto} />
        </Campo>
        <Campo id="pg-fecha" label="Fecha del pago">
          <input
            id="pg-fecha"
            className={ui.input}
            type="date"
            value={fecha}
            min={`${mes}-01`}
            max={hoy < f.vence ? hoy : undefined}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
      </div>
      <Campo id="pg-quien" label="¿Quién pagó?">
        <select id="pg-quien" className={ui.input} value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value)}>
          {integrantes.map((i) => (
            <option key={i.uid} value={i.uid}>
              {i.uid === yo ? `${i.nombre} (yo)` : i.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <MensajeError error={error} />
      <Enviar ocupado={ocupado} texto="Marcar pagado" />
    </form>
  );
}
