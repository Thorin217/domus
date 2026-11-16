import type { Metadata } from "next";
import { PremiosPanel } from "@/components/app/premios/PremiosPanel";

export const metadata: Metadata = { title: "Premios y castigos — Domus" };

export default function PremiosPage() {
  return <PremiosPanel />;
}
