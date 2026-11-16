import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// IBM Plex Sans en todo (DESIGN.md §4).
const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Domus — Todo el hogar, en un solo lugar",
  description:
    "Domus junta las compras, los gastos fijos, los quehaceres y los premios y castigos de cada integrante de la familia.",
  applicationName: "Domus",
  // iPhone: al agregarla a la pantalla de inicio se abre como app (y puede recibir notificaciones).
  appleWebApp: { capable: true, title: "Domus", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={plex.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
