import type { Metadata } from "next";
import { Resumen } from "@/components/app/Resumen";

export const metadata: Metadata = { title: "Resumen — Domus" };

export default function InicioPage() {
  return <Resumen />;
}
