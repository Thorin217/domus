"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { LARGO_CODIGO, LIMITES, normalizarCodigo } from "@/lib/hogar/types";
import { useAuth } from "./AuthProvider";
import ui from "@/components/ui/ui.module.css";
import styles from "./auth.module.css";

export function BienvenidaForm({ unirseInicial, codigoInicial }: { unirseInicial: boolean; codigoInicial: string }) {
  const router = useRouter();
  const { user, perfil, cargando, salir } = useAuth();
  const [unirse, setUnirse] = useState(unirseInicial);
  const [nombre, setNombre] = useState<string | null>(null);
  const [nombreHogar, setNombreHogar] = useState("");
  const [codigo, setCodigo] = useState(normalizarCodigo(codigoInicial));
  const [enviando, setEnviando] = useState(false);
  /** A dónde ir cuando el perfil (en tiempo real) confirme el hogar. */
  const [destino, setDestino] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Next preserva esta pantalla oculta al navegar; si el usuario vuelve sin hogar
  // (p. ej. salió del hogar), se reinicia el envío anterior.
  const hogarId = perfil?.hogarId ?? null;
  const [hogarPrevio, setHogarPrevio] = useState(hogarId);
  if (hogarId !== hogarPrevio) {
    setHogarPrevio(hogarId);
    if (!hogarId) {
      setEnviando(false);
      setDestino(null);
    }
  }

  // La respuesta de la API y la actualización del perfil llegan en cualquier orden:
  // solo se navega cuando ambas están (si no, /inicio rebotaría a /bienvenida).
  useEffect(() => {
    if (cargando) return;
    if (!user) router.replace(`/login${codigoInicial ? `?modo=crear&codigo=${encodeURIComponent(codigoInicial)}` : ""}`);
    else if (hogarId && (!enviando || destino)) router.replace(destino ?? "/inicio");
  }, [user, hogarId, cargando, enviando, destino, codigoInicial, router]);

  // Sugerimos el nombre de la cuenta (Google o el que puso al registrarse).
  const nombreSugerido = perfil?.nombre || user?.displayName?.split(" ")[0] || "";
  const nombreFinal = nombre ?? nombreSugerido;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombreFinal.trim()) return setError("Escribe tu nombre.");
    if (unirse && codigo.length !== LARGO_CODIGO) return setError(`El código tiene ${LARGO_CODIGO} letras o números.`);
    if (!unirse && !nombreHogar.trim()) return setError("Ponle un nombre a tu hogar.");

    setEnviando(true);
    try {
      if (unirse) await api("/api/hogar/unirse", { body: { codigo, nombre: nombreFinal } });
      else await api("/api/hogar", { body: { nombreHogar, nombre: nombreFinal } });
      setDestino(unirse ? "/inicio" : "/familia?nuevo=1");
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  if (cargando || !user || perfil?.hogarId) {
    return (
      <div className={ui.pantallaCarga} style={{ minHeight: 200 }}>
        <span className={ui.spinner} aria-label="Cargando" />
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.formHead}>
        <h2 className={styles.formTitle}>{unirse ? "Únete a tu familia" : "Crea tu hogar"}</h2>
        <p className={styles.formText}>
          {unirse
            ? "Escribe el código que te pasó quien creó el hogar."
            : "Vas a ser el admin: invitas a la familia y decides quién más administra."}
        </p>
      </div>

      <div className={ui.segmented} role="group" aria-label="¿Qué quieres hacer?">
        <button type="button" className={ui.segment} aria-pressed={!unirse} onClick={() => (setUnirse(false), setError(null))}>
          Crear hogar
        </button>
        <button type="button" className={ui.segment} aria-pressed={unirse} onClick={() => (setUnirse(true), setError(null))}>
          Tengo código
        </button>
      </div>

      {error && (
        <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
          {error}
        </p>
      )}

      {unirse ? (
        <div className={ui.field}>
          <label htmlFor="b-codigo" className={ui.label}>
            Código familiar
          </label>
          <input
            id="b-codigo"
            className={`${ui.input} ${ui.codigoInput}`}
            value={codigo}
            onChange={(e) => setCodigo(normalizarCodigo(e.target.value).slice(0, LARGO_CODIGO))}
            placeholder="ABC234"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            aria-describedby="b-codigo-ayuda"
          />
          <span id="b-codigo-ayuda" className={ui.ayuda}>
            {LARGO_CODIGO} letras o números. Lo encuentra el admin en “Familia”.
          </span>
        </div>
      ) : (
        <div className={ui.field}>
          <label htmlFor="b-hogar" className={ui.label}>
            Nombre del hogar
          </label>
          <input
            id="b-hogar"
            className={ui.input}
            value={nombreHogar}
            onChange={(e) => setNombreHogar(e.target.value)}
            placeholder="Casa Escobar"
            maxLength={LIMITES.nombreHogar}
            autoComplete="off"
          />
        </div>
      )}

      <div className={ui.field}>
        <label htmlFor="b-nombre" className={ui.label}>
          Tu nombre en la familia
        </label>
        <input
          id="b-nombre"
          className={ui.input}
          value={nombreFinal}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Mamá, Papá, Sofía…"
          maxLength={LIMITES.nombre}
          autoComplete="given-name"
        />
      </div>

      <button type="submit" className={`${ui.btn} ${ui.lg} ${ui.primario}`} disabled={enviando}>
        {enviando ? <span className={ui.spinner} aria-label="Cargando" /> : unirse ? "Unirme" : "Crear mi hogar"}
      </button>

      <p className={styles.foot}>
        Entraste como {user.email}.{" "}
        <button type="button" className={styles.linkBtn} onClick={() => salir()}>
          Cambiar de cuenta
        </button>
      </p>
    </form>
  );
}
