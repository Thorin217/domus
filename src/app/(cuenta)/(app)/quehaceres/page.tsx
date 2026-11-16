import type { Metadata } from "next";
import { QuehaceresPanel } from "@/components/app/quehaceres/QuehaceresPanel";

export const metadata: Metadata = { title: "Quehaceres — Domus" };

export default function QuehaceresPage() {
  return <QuehaceresPanel />;
}
