import type { Metadata } from "next";
import { ComprasPanel } from "@/components/app/gastos/ComprasPanel";

export const metadata: Metadata = { title: "Compras y gastos — Domus" };

export default function ComprasPage() {
  return <ComprasPanel />;
}
