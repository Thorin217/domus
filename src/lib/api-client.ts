import { getFirebaseAuth } from "@/lib/firebase";

/** Llama a nuestras rutas /api con el token de la sesión. Lanza Error con el mensaje del servidor. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Tienes que iniciar sesión.");
  const token = await user.getIdToken();

  const res = await fetch(path, {
    method: init.method ?? "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Algo salió mal. Intenta de nuevo.");
  return data as T;
}

/** Mensajes de Firebase Auth en español y en tuteo. */
export function mensajeAuth(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const mensajes: Record<string, string> = {
    "auth/invalid-credential": "El correo o la contraseña no coinciden.",
    "auth/wrong-password": "El correo o la contraseña no coinciden.",
    "auth/user-not-found": "No hay una cuenta con ese correo.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Entra con ella.",
    "auth/invalid-email": "Ese correo no parece válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/missing-password": "Escribe tu contraseña.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento y vuelve a probar.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
    "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
    "auth/cancelled-popup-request": "Cerraste la ventana de Google antes de terminar.",
    "auth/popup-blocked": "Tu navegador bloqueó la ventana de Google.",
  };
  return mensajes[code] ?? (e instanceof Error && !code ? e.message : "Algo salió mal. Intenta de nuevo.");
}
