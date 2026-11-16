"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { LIMITES, type Integrante } from "@/lib/hogar/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { CopyIcon, CrownIcon, MoreIcon, RefreshIcon, ShareIcon } from "@/components/Icons";
import { useHogarActual } from "./AppShell";
import { Notificaciones } from "./Notificaciones";
import ui from "@/components/ui/ui.module.css";
import styles from "./familia.module.css";

type Accion = { tipo: "opciones"; integrante: Integrante } | { tipo: "codigo" } | { tipo: "salir" } | null;

export function FamiliaPanel({ recienCreado }: { recienCreado: boolean }) {
  const { hogar, integrantes, yo, esAdmin } = useHogarActual();
  const [accion, setAccion] = useState<Accion>(null);
  const [aviso, setAviso] = useState<string | null>(recienCreado ? "¡Tu hogar está listo! Ahora invita a tu familia con el código." : null);

  // El aviso se va solo después de unos segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const admins = integrantes.filter((i) => i.rol === "admin").length;

  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.h1}>Familia</h1>
        <p className={styles.sub}>
          {hogar.nombre} · {integrantes.length} {integrantes.length === 1 ? "integrante" : "integrantes"}
        </p>
      </div>

      {aviso && (
        <p className={`${ui.alerta} ${ui.alertaOk}`} role="status">
          {aviso}
        </p>
      )}

      <div className={styles.grid}>
        <TarjetaCodigo codigo={hogar.codigo} esAdmin={esAdmin} onAviso={setAviso} onNuevo={() => setAccion({ tipo: "codigo" })} />

        <section className={`${ui.card} ${styles.lista}`} aria-labelledby="t-integrantes">
          <h2 id="t-integrantes" className={styles.h2}>
            Integrantes
          </h2>
          <ul className={styles.rows}>
            {integrantes.map((i) => {
              const esYo = i.uid === yo.uid;
              const puedeEditar = esAdmin || esYo;
              return (
                <li key={i.uid} className={styles.row}>
                  <Avatar nombre={i.nombre} color={i.color} />
                  <div className={styles.rowText}>
                    <span className={styles.rowName}>
                      {i.nombre}
                      {esYo && <span className={styles.tu}> (tú)</span>}
                    </span>
                    {i.email && <span className={styles.rowMail}>{i.email}</span>}
                  </div>
                  {i.rol === "admin" && (
                    <span className={`${ui.chip} ${styles.chipAdmin}`}>
                      <CrownIcon size={14} />
                      Admin
                    </span>
                  )}
                  {puedeEditar && (
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.iconBtn} ${styles.more}`}
                      aria-label={`Opciones de ${i.nombre}`}
                      onClick={() => setAccion({ tipo: "opciones", integrante: i })}
                    >
                      <MoreIcon size={22} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {integrantes.length === 1 && (
            <p className={styles.vacio}>Todavía estás solo en casa. Comparte el código para que se unan.</p>
          )}
        </section>

        <Notificaciones />

        {esAdmin && <AjustesHogar onAviso={setAviso} />}

        <section className={`${ui.card} ${styles.cuenta}`} aria-labelledby="t-cuenta">
          <h2 id="t-cuenta" className={styles.h2}>
            Tu lugar en el hogar
          </h2>
          <p className={styles.texto}>
            {esAdmin
              ? admins > 1
                ? "Eres admin junto con otros integrantes."
                : "Eres el único admin. Si sales, nombra antes a otro admin."
              : "Eres integrante. El admin maneja el código, los roles y los ajustes."}
          </p>
          <button type="button" className={`${ui.btn} ${ui.peligro}`} onClick={() => setAccion({ tipo: "salir" })}>
            Salir del hogar
          </button>
        </section>
      </div>

      <Sheet
        abierto={accion?.tipo === "opciones"}
        onCerrar={() => setAccion(null)}
        titulo={accion?.tipo === "opciones" ? accion.integrante.nombre : ""}
      >
        {accion?.tipo === "opciones" && (
          <OpcionesIntegrante
            key={accion.integrante.uid}
            integrante={integrantes.find((i) => i.uid === accion.integrante.uid) ?? accion.integrante}
            esYo={accion.integrante.uid === yo.uid}
            esAdmin={esAdmin}
            unicoAdmin={admins <= 1}
            onListo={(msg) => {
              setAccion(null);
              setAviso(msg);
            }}
          />
        )}
      </Sheet>

      <Sheet abierto={accion?.tipo === "codigo"} onCerrar={() => setAccion(null)} titulo="¿Generar un código nuevo?">
        <Confirmar
          texto="El código actual deja de funcionar. Quienes ya están en el hogar no se ven afectados."
          boton="Generar código nuevo"
          onCancelar={() => setAccion(null)}
          onConfirmar={async () => {
            await api("/api/hogar/codigo");
            setAccion(null);
            setAviso("Listo, hay un código nuevo.");
          }}
        />
      </Sheet>

      <Sheet abierto={accion?.tipo === "salir"} onCerrar={() => setAccion(null)} titulo="¿Salir del hogar?">
        <SalirHogar ultimo={integrantes.length === 1} onCancelar={() => setAccion(null)} />
      </Sheet>
    </>
  );
}

/* ---------------- Código familiar ---------------- */

function TarjetaCodigo({
  codigo,
  esAdmin,
  onAviso,
  onNuevo,
}: {
  codigo: string;
  esAdmin: boolean;
  onAviso: (m: string) => void;
  onNuevo: () => void;
}) {
  // Hoja nativa de compartir (WhatsApp, etc.) en móvil; en escritorio se copia.
  const puedeCompartir = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  const enlace = () => `${window.location.origin}/login?modo=crear&codigo=${codigo}`;

  async function copiar(texto: string, msg: string) {
    try {
      await navigator.clipboard.writeText(texto);
      onAviso(msg);
    } catch {
      onAviso(`Tu código es ${codigo}.`);
    }
  }

  async function compartir() {
    const texto = `Únete a nuestro hogar en Domus con el código ${codigo}`;
    if (puedeCompartir) {
      try {
        await navigator.share({ title: "Domus", text: texto, url: enlace() });
      } catch {
        /* el usuario canceló */
      }
    } else {
      copiar(`${texto}: ${enlace()}`, "Copiamos la invitación. Pégala en el chat de la familia.");
    }
  }

  return (
    <section className={styles.codigoCard} aria-labelledby="t-codigo">
      <div className={styles.codigoHead}>
        <h2 id="t-codigo" className={styles.h2}>
          Código familiar
        </h2>
        <p className={styles.codigoTexto}>Compártelo para que la familia se una a tu hogar.</p>
      </div>
      <p className={styles.codigo} aria-label={`Código: ${codigo.split("").join(" ")}`}>
        {codigo}
      </p>
      <div className={styles.codigoBtns}>
        <button type="button" className={`${ui.btn} ${ui.lg} ${ui.primario}`} onClick={compartir}>
          <ShareIcon size={20} />
          {puedeCompartir ? "Compartir invitación" : "Copiar invitación"}
        </button>
        <button type="button" className={`${ui.btn} ${ui.lg} ${ui.secundario}`} onClick={() => copiar(codigo, "Código copiado.")}>
          <CopyIcon size={20} />
          Copiar código
        </button>
      </div>
      {esAdmin && (
        <button type="button" className={styles.linkBtn} onClick={onNuevo}>
          <RefreshIcon size={18} />
          Generar código nuevo
        </button>
      )}
    </section>
  );
}

/* ---------------- Opciones por integrante ---------------- */

function OpcionesIntegrante({
  integrante,
  esYo,
  esAdmin,
  unicoAdmin,
  onListo,
}: {
  integrante: Integrante;
  esYo: boolean;
  esAdmin: boolean;
  unicoAdmin: boolean;
  onListo: (msg: string) => void;
}) {
  const [nombre, setNombre] = useState(integrante.nombre);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const correr = async (fn: () => Promise<unknown>, msg: string) => {
    setError(null);
    setOcupado(true);
    try {
      await fn();
      onListo(msg);
    } catch (e) {
      setError((e as Error).message);
      setOcupado(false);
    }
  };

  const ruta = `/api/hogar/integrantes/${integrante.uid}`;
  const esAdminObjetivo = integrante.rol === "admin";

  function guardarNombre(e: FormEvent) {
    e.preventDefault();
    if (nombre.trim() === integrante.nombre) return;
    correr(() => api(ruta, { method: "PATCH", body: { nombre } }), "Nombre actualizado.");
  }

  if (confirmarQuitar) {
    return (
      <Confirmar
        texto={`${integrante.nombre} ya no verá los gastos ni quehaceres de la familia. Podrá volver con el código.`}
        boton={`Quitar a ${integrante.nombre}`}
        onCancelar={() => setConfirmarQuitar(false)}
        onConfirmar={async () => {
          await api(ruta, { method: "DELETE" });
          onListo(`${integrante.nombre} ya no está en el hogar.`);
        }}
      />
    );
  }

  return (
    <div className={styles.opciones}>
      {error && (
        <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
          {error}
        </p>
      )}

      <form className={styles.inline} onSubmit={guardarNombre}>
        <div className={ui.field} style={{ flex: 1 }}>
          <label htmlFor="op-nombre" className={ui.label}>
            {esYo ? "Tu nombre" : "Nombre"}
          </label>
          <input
            id="op-nombre"
            className={ui.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={LIMITES.nombre}
          />
        </div>
        <button
          type="submit"
          className={`${ui.btn} ${ui.lg} ${ui.primario}`}
          disabled={ocupado || !nombre.trim() || nombre.trim() === integrante.nombre}
        >
          Guardar
        </button>
      </form>

      {esAdmin && (
        <>
          {esAdminObjetivo ? (
            <button
              type="button"
              className={`${ui.btn} ${ui.lg} ${ui.secundario}`}
              disabled={ocupado || unicoAdmin}
              onClick={() =>
                correr(() => api(ruta, { method: "PATCH", body: { rol: "miembro" } }), `${integrante.nombre} ya no es admin.`)
              }
            >
              Quitar como admin
            </button>
          ) : (
            <button
              type="button"
              className={`${ui.btn} ${ui.lg} ${ui.azul}`}
              disabled={ocupado}
              onClick={() =>
                correr(() => api(ruta, { method: "PATCH", body: { rol: "admin" } }), `${integrante.nombre} ahora es admin.`)
              }
            >
              <CrownIcon size={20} />
              Hacer admin
            </button>
          )}
          {esAdminObjetivo && unicoAdmin && (
            <p className={ui.ayuda}>El hogar necesita al menos un admin. Nombra a otro antes.</p>
          )}
          {!esYo && (
            <button
              type="button"
              className={`${ui.btn} ${ui.lg} ${ui.peligro}`}
              disabled={ocupado}
              onClick={() => setConfirmarQuitar(true)}
            >
              Quitar del hogar
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Ajustes del hogar (admin) ---------------- */

function AjustesHogar({ onAviso }: { onAviso: (m: string) => void }) {
  const { hogar } = useHogarActual();
  const [nombre, setNombre] = useState(hogar.nombre);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sinCambios = nombre.trim() === hogar.nombre;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOcupado(true);
    try {
      await api("/api/hogar", { method: "PATCH", body: { nombre } });
      onAviso("Ajustes guardados.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={ui.card} aria-labelledby="t-ajustes">
      <h2 id="t-ajustes" className={styles.h2}>
        Ajustes del hogar
      </h2>
      <form className={styles.form} onSubmit={guardar} noValidate>
        {error && (
          <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
            {error}
          </p>
        )}
        <div className={ui.field}>
          <label htmlFor="aj-nombre" className={ui.label}>
            Nombre del hogar
          </label>
          <input
            id="aj-nombre"
            className={ui.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={LIMITES.nombreHogar}
          />
        </div>
        <p className={ui.ayuda}>
          El presupuesto del mes y sus categorías ahora se ajustan en <Link href="/compras">Compras y gastos</Link>.
        </p>
        <button type="submit" className={`${ui.btn} ${ui.lg} ${ui.primario}`} disabled={ocupado || sinCambios || !nombre.trim()}>
          {ocupado ? <span className={ui.spinner} aria-label="Guardando" /> : "Guardar cambios"}
        </button>
      </form>
    </section>
  );
}

/* ---------------- Salir / confirmar ---------------- */

function SalirHogar({ ultimo, onCancelar }: { ultimo: boolean; onCancelar: () => void }) {
  const { salir } = useAuth();
  return (
    <Confirmar
      texto={
        ultimo
          ? "Eres el último integrante: el hogar y todos sus datos se borran para siempre."
          : "Dejarás de ver los gastos y quehaceres de la familia. Puedes volver con el código."
      }
      boton={ultimo ? "Salir y borrar el hogar" : "Salir del hogar"}
      onCancelar={onCancelar}
      onConfirmar={async () => {
        // No navegamos aquí: AppShell lleva a /bienvenida cuando el perfil (en tiempo real)
        // ya no tiene hogar. Navegar antes rebotaría de vuelta a /inicio.
        await api("/api/hogar/salir");
        await new Promise(() => {}); // deja el botón en "procesando" hasta la redirección
      }}
      extra={
        <button type="button" className={`${ui.btn} ${ui.lg} ${ui.secundario}`} onClick={() => salir()}>
          Mejor solo cerrar sesión
        </button>
      }
    />
  );
}

function Confirmar({
  texto,
  boton,
  onConfirmar,
  onCancelar,
  extra,
}: {
  texto: string;
  boton: string;
  onConfirmar: () => Promise<void>;
  onCancelar: () => void;
  extra?: ReactNode;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={styles.opciones}>
      <p className={styles.texto}>{texto}</p>
      {error && (
        <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className={`${ui.btn} ${ui.lg} ${ui.primario}`}
        disabled={ocupado}
        onClick={async () => {
          setError(null);
          setOcupado(true);
          try {
            await onConfirmar();
          } catch (e) {
            setError((e as Error).message);
            setOcupado(false);
          }
        }}
      >
        {ocupado ? <span className={ui.spinner} aria-label="Procesando" /> : boton}
      </button>
      {extra}
      <button type="button" className={`${ui.btn} ${ui.lg} ${ui.secundario}`} onClick={onCancelar} disabled={ocupado}>
        Cancelar
      </button>
    </div>
  );
}
