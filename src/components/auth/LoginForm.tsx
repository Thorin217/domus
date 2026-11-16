"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { mensajeAuth } from "@/lib/api-client";
import { useAuth } from "./AuthProvider";
import { GoogleIcon, HouseKeyIcon } from "@/components/Icons";
import ui from "@/components/ui/ui.module.css";
import styles from "./auth.module.css";

type Modo = "entrar" | "crear";

export function LoginForm({ modoInicial, codigo }: { modoInicial: Modo; codigo?: string }) {
  const router = useRouter();
  const { user, perfil, cargando } = useAuth();
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [unirse, setUnirse] = useState(Boolean(codigo));
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Con sesión: al hogar si ya tiene, si no a crear/unirse.
  useEffect(() => {
    if (cargando || !user) return;
    if (perfil?.hogarId) {
      router.replace("/inicio");
      return;
    }
    const q = new URLSearchParams();
    if (codigo) q.set("codigo", codigo);
    else if (unirse) q.set("unirse", "1");
    router.replace(`/bienvenida${q.size ? `?${q}` : ""}`);
  }, [user, perfil, cargando, codigo, unirse, router]);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setError(null);
    setAviso(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    const auth = getFirebaseAuth();
    try {
      if (modo === "crear") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        if (nombre.trim()) await updateProfile(cred.user, { displayName: nombre.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), pass);
      }
    } catch (err) {
      setError(mensajeAuth(err));
      setEnviando(false);
    }
  }

  async function conGoogle() {
    setError(null);
    setEnviando(true);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (err) {
      setError(mensajeAuth(err));
      setEnviando(false);
    }
  }

  async function recuperar() {
    setError(null);
    setAviso(null);
    if (!email.trim()) {
      setError("Escribe tu correo arriba y vuelve a tocar “¿La olvidaste?”.");
      return;
    }
    try {
      const auth = getFirebaseAuth();
      auth.languageCode = "es";
      await sendPasswordResetEmail(auth, email.trim());
      setAviso(`Te enviamos un correo a ${email.trim()} para cambiar tu contraseña.`);
    } catch (err) {
      setError(mensajeAuth(err));
    }
  }

  const crear = modo === "crear";
  const titulo = unirse ? "Únete a tu familia" : crear ? "Crea tu cuenta" : "Inicia sesión";
  const texto = unirse
    ? "Primero crea tu cuenta o entra. Después escribes el código que te pasaron."
    : crear
      ? "Con tu cuenta creas el hogar de tu familia o te unes a uno."
      : "Accede para ver los gastos y quehaceres de tu hogar.";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.formHead}>
        <h2 className={styles.formTitle}>{titulo}</h2>
        <p className={styles.formText}>{texto}</p>
      </div>

      <div className={ui.segmented} role="group" aria-label="Tipo de acceso">
        <button type="button" className={ui.segment} aria-pressed={!crear} onClick={() => cambiarModo("entrar")}>
          Entrar
        </button>
        <button type="button" className={ui.segment} aria-pressed={crear} onClick={() => cambiarModo("crear")}>
          Crear cuenta
        </button>
      </div>

      {error && (
        <p className={`${ui.alerta} ${ui.alertaError}`} role="alert">
          {error}
        </p>
      )}
      {aviso && (
        <p className={`${ui.alerta} ${ui.alertaOk}`} role="status">
          {aviso}
        </p>
      )}

      {crear && (
        <div className={ui.field}>
          <label htmlFor="l-nombre" className={ui.label}>
            Tu nombre
          </label>
          <input
            id="l-nombre"
            className={ui.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Como te dice la familia"
            autoComplete="given-name"
            maxLength={40}
          />
        </div>
      )}

      <div className={ui.field}>
        <label htmlFor="l-email" className={ui.label}>
          Correo
        </label>
        <input
          id="l-email"
          type="email"
          inputMode="email"
          className={ui.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
          autoCapitalize="none"
          required
        />
      </div>

      <div className={ui.field}>
        <div className={styles.labelRow}>
          <label htmlFor="l-pass" className={ui.label}>
            Contraseña
          </label>
          {!crear && (
            <button type="button" className={styles.linkBtn} onClick={recuperar}>
              ¿La olvidaste?
            </button>
          )}
        </div>
        <div className={styles.passWrap}>
          <input
            id="l-pass"
            type={verPass ? "text" : "password"}
            className={ui.input}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={crear ? "Mínimo 6 caracteres" : "••••••••"}
            autoComplete={crear ? "new-password" : "current-password"}
            required
            minLength={6}
          />
          <button
            type="button"
            className={styles.verPass}
            onClick={() => setVerPass((v) => !v)}
            aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {verPass ? "Ocultar" : "Ver"}
          </button>
        </div>
      </div>

      <button type="submit" className={`${ui.btn} ${ui.lg} ${ui.primario}`} disabled={enviando}>
        {enviando ? <span className={ui.spinner} aria-label="Cargando" /> : crear ? "Crear cuenta" : "Entrar"}
      </button>

      <div className={ui.divider}>o</div>

      <button type="button" className={`${ui.btn} ${ui.lg} ${ui.secundario}`} onClick={conGoogle} disabled={enviando}>
        <GoogleIcon size={22} />
        Seguir con Google
      </button>

      {!unirse && (
        <button
          type="button"
          className={`${ui.btn} ${ui.lg} ${ui.secundario}`}
          onClick={() => {
            setUnirse(true);
            cambiarModo("crear");
          }}
        >
          <HouseKeyIcon size={22} />
          Entrar con código familiar
        </button>
      )}

      <p className={styles.foot}>
        {crear ? (
          <>
            ¿Ya tienes cuenta?{" "}
            <button type="button" className={styles.linkBtn} onClick={() => cambiarModo("entrar")}>
              Entra aquí
            </button>
          </>
        ) : (
          <>
            ¿Primera vez?{" "}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setUnirse(false);
                cambiarModo("crear");
              }}
            >
              Crea el hogar de tu familia
            </button>
          </>
        )}
      </p>
    </form>
  );
}
