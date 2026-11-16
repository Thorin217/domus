import type { Metadata } from "next";
import { FijosPanel } from "@/components/app/gastos/FijosPanel";

export const metadata: Metadata = { title: "Gastos fijos — Domus" };

export default function GastosFijosPage() {
  return <FijosPanel />;
}
