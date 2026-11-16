"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

const CLAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type EstadoPush =
  | "cargando"
  | "no-soportado" // navegador sin notificaciones push
  | "ios-instalar" // iPhone/iPad: hay que agregar Domus a la pantalla de inicio
  | "bloqueado" // la persona las bloqueó en el navegador
  | "inactivo"
  | "activo";

function claveBytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function esIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function esInstalada() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function soportado() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!CLAVE;
}

export async function registrarSW() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function suscripcionActual() {
  if (!soportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Quita este dispositivo de la cuenta (al cerrar sesión o desactivar). */
export async function olvidarDispositivo() {
  const sub = await suscripcionActual();
  if (sub) await api("/api/push", { method: "DELETE", body: { endpoint: sub.endpoint } });
}

async function guardar(sub: PushSubscription) {
  await api("/api/push", { body: { sub: sub.toJSON() } });
}

/** Estado de las notificaciones en este dispositivo y acciones para cambiarlo. */
export function usePush() {
  const [estado, setEstado] = useState<EstadoPush>("cargando");

  const revisar = useCallback(async () => {
    if (!soportado()) return setEstado(esIOS() && !esInstalada() ? "ios-instalar" : "no-soportado");
    if (Notification.permission === "denied") return setEstado("bloqueado");
    const sub = await suscripcionActual();
    setEstado(sub && Notification.permission === "granted" ? "activo" : "inactivo");
  }, []);

  useEffect(() => {
    // Diferido: no se llama a setState de forma síncrona dentro del efecto.
    const t = setTimeout(revisar, 0);
    return () => clearTimeout(t);
  }, [revisar]);

  const activar = useCallback(async () => {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
      throw new Error(permiso === "denied" ? "Bloqueaste las notificaciones. Actívalas en los ajustes del navegador." : "No diste permiso para avisarte.");
    }
    const reg = (await registrarSW())!;
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveBytes(CLAVE) }).catch(() => {
        // Pasa en ventanas de incógnito y en navegadores sin servicio de avisos.
        throw new Error("Este navegador no pudo activar los avisos. Si estás en incógnito, abre Domus en una ventana normal.");
      }));
    await guardar(sub);
    setEstado("activo");
  }, []);

  const desactivar = useCallback(async () => {
    const sub = await suscripcionActual();
    if (sub) {
      await api("/api/push", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => {});
      await sub.unsubscribe();
    }
    setEstado("inactivo");
  }, []);

  return { estado, activar, desactivar };
}

/**
 * Se monta una vez con la sesión iniciada: registra el service worker y, si este dispositivo ya
 * tenía avisos activos, vuelve a guardar la suscripción a nombre de quien está usando la app.
 */
export function useSincronizarPush(uid: string | null) {
  useEffect(() => {
    if (!uid || !soportado()) return;
    let vivo = true;
    (async () => {
      await registrarSW();
      const sub = await suscripcionActual();
      if (vivo && sub && Notification.permission === "granted") await guardar(sub).catch(() => {});
    })().catch(() => {});

    // El navegador renovó la suscripción: guardar la nueva.
    const alMensaje = async (e: MessageEvent) => {
      if (e.data?.tipo !== "push-renovar") return;
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub =
        (await reg?.pushManager.getSubscription()) ??
        (await reg?.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveBytes(CLAVE) }));
      if (sub) await guardar(sub).catch(() => {});
    };
    navigator.serviceWorker.addEventListener("message", alMensaje);
    return () => {
      vivo = false;
      navigator.serviceWorker.removeEventListener("message", alMensaje);
    };
  }, [uid]);
}
