import { AuthProvider } from "@/components/auth/AuthProvider";

/**
 * Un solo AuthProvider para login, bienvenida y la app: así los listeners de
 * Firestore (perfil) sobreviven a la navegación entre grupos de rutas. Si cada
 * grupo tuviera el suyo, al navegar se cancelaban y reabrían los mismos listeners
 * y a veces el nuevo arrancaba con datos viejos.
 */
export default function CuentaLayout({ children }: LayoutProps<"/">) {
  return <AuthProvider>{children}</AuthProvider>;
}
