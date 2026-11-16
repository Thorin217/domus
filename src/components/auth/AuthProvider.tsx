"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { olvidarDispositivo } from "@/lib/avisos/push-client";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import type { Usuario } from "@/lib/hogar/types";

type AuthState = {
  user: User | null;
  /** Perfil en Firestore (usuarios/{uid}); null si aún no existe. */
  perfil: Usuario | null;
  /** true hasta saber si hay sesión y, si la hay, leer el perfil. */
  cargando: boolean;
  salir: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cortarPerfil: (() => void) | undefined;
    const cortarAuth = onAuthStateChanged(getFirebaseAuth(), (u) => {
      cortarPerfil?.();
      setUser(u);
      if (!u) {
        setPerfil(null);
        setCargando(false);
        return;
      }
      setCargando(true);
      cortarPerfil = onSnapshot(
        doc(getDb(), "usuarios", u.uid),
        (snap) => {
          const d = snap.data();
          setPerfil(d ? { hogarId: d.hogarId ?? null, nombre: d.nombre ?? "", avisos: d.avisos ?? {} } : null);
          setCargando(false);
        },
        () => {
          setPerfil(null);
          setCargando(false);
        },
      );
    });
    return () => {
      cortarPerfil?.();
      cortarAuth();
    };
  }, []);

  // Al cerrar sesión, este dispositivo deja de recibir los avisos de esta cuenta.
  const salir = async () => {
    await olvidarDispositivo().catch(() => {});
    await signOut(getFirebaseAuth());
  };

  return <AuthContext.Provider value={{ user, perfil, cargando, salir }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
