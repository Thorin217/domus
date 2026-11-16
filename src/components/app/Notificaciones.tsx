"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { esIOS, usePush } from "@/lib/avisos/push-client";
import { TIPOS_AVISO, preferenciasDe, type TipoAviso } from "@/lib/avisos/types";
import ui from "@/components/ui/ui.module.css";
import styles from "./notificaciones.module.css";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Avisos al teléfono: activar en este dispositivo, prueba y qué recibir. */
export function Notificaciones() {
  const { perfil } = useAuth();
  const { estado, activar, desactivar } = usePush();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [instalar, setInstalar] = useState<EventoInstalar | null>(null);
  const prefs = preferenciasDe(perfil?.avisos);

  // Android/Chrome: ofrecer instalar Domus como app.
  useEffect(() => {
    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setInstalar(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    return () => window.removeEventListener("beforeinstallprompt", alOfrecer);
  }, []);

  async function hacer(fn: () => Promise<unknown>, ok: string) {
    setOcupado(true);
    setMensaje(null);
    try {
      await fn();
      setMensaje({ ok: true, texto: ok });
    } catch (e) {
      setMensaje({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  async function cambiar(tipo: TipoAviso, valor: boolean) {
    try {
      await api("/api/push", { method: "PATCH", body: { avisos: { [tipo]: valor } } });
    } catch (e) {
      setMensaje({ ok: false, texto: (e as Error).message });
    }
  }

  return (
    <section className={ui.card} aria-labelledby="t-notif">
      <div className={styles.head}>
        <h2 id="t-notif" className={styles.h2}>
          Notificaciones
        </h2>
        {estado === "activo" && (
          <span className={styles.badge} data-tono="ok">
            Activas aquí
          </span>
        )}
      </div>

      {estado === "cargando" && <span className={ui.spinner} aria-label="Revisando" />}

      {estado === "ios-instalar" && (
        <div className={styles.pasos}>
          <p className={styles.texto}>En iPhone, los avisos llegan cuando Domus está en tu pantalla de inicio:</p>
          <ol>
            <li>
              Abre Domus en <b>Safari</b> y toca <b>Compartir</b> (el cuadrado con la flecha).
            </li>
            <li>
              Elige <b>Agregar a pantalla de inicio</b> y toca <b>Agregar</b>.
            </li>
            <li>
              Abre Domus desde ese ícono, vuelve a <b>Familia</b> y toca <b>Activar notificaciones</b>.
            </li>
          </ol>
          <p className={styles.nota}>Necesitas iOS 16.4 o más nuevo.</p>
        </div>
      )}

      {estado === "no-soportado" && (
        <p className={styles.texto}>
          Este navegador no permite notificaciones. En Android usa <b>Chrome</b>; en iPhone, <b>Safari</b> con Domus agregado a la
          pantalla de inicio.
        </p>
      )}

      {estado === "bloqueado" && (
        <p className={styles.texto}>
          Bloqueaste las notificaciones de Domus. Para activarlas, toca el candado junto a la dirección (o abre los ajustes del
          navegador), permite las notificaciones y vuelve a cargar la página.
          {esIOS() && " En iPhone: Ajustes → Notificaciones → Domus."}
        </p>
      )}

      {estado === "inactivo" && (
        <>
          <p className={styles.texto}>Recibe en este dispositivo lo que te toca hoy, las votaciones, si te acusan y los pagos por vencer.</p>
          <button
            type="button"
            className={`${ui.btn} ${ui.lg} ${ui.primario}`}
            onClick={() => hacer(activar, "¡Listo! Este dispositivo recibirá los avisos.")}
            disabled={ocupado}
          >
            {ocupado ? <span className={ui.spinner} aria-label="Activando" /> : "Activar notificaciones"}
          </button>
        </>
      )}

      {estado === "activo" && (
        <div className={styles.acciones}>
          <button
            type="button"
            className={`${ui.btn} ${ui.azul}`}
            onClick={() =>
              hacer(async () => {
                const r = await api<{ enviados: number }>("/api/push/prueba");
                if (!r.enviados) throw new Error("No se pudo enviar. Desactiva y vuelve a activar las notificaciones.");
              }, "Te mandamos un aviso de prueba.")
            }
            disabled={ocupado}
          >
            Enviar prueba
          </button>
          <button type="button" className={`${ui.btn} ${ui.suave}`} onClick={() => hacer(desactivar, "Este dispositivo ya no recibirá avisos.")} disabled={ocupado}>
            Desactivar aquí
          </button>
        </div>
      )}

      {instalar && (
        <button
          type="button"
          className={`${ui.btn} ${ui.secundario}`}
          onClick={async () => {
            await instalar.prompt();
            setInstalar(null);
          }}
        >
          Instalar Domus en este teléfono
        </button>
      )}

      {mensaje && (
        <p className={`${ui.alerta} ${mensaje.ok ? ui.alertaOk : ui.alertaError}`} role={mensaje.ok ? "status" : "alert"}>
          {mensaje.texto}
        </p>
      )}

      <fieldset className={styles.prefs}>
        <legend className={styles.legend}>Qué quieres recibir (en todos tus dispositivos)</legend>
        {TIPOS_AVISO.map((t) => (
          <label key={t.id} className={styles.pref}>
            <span className={styles.prefTexto}>
              <b>{t.titulo}</b>
              <span>{t.detalle}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className={styles.switch}
              checked={prefs[t.id]}
              onChange={(e) => cambiar(t.id, e.target.checked)}
            />
          </label>
        ))}
      </fieldset>
    </section>
  );
}
