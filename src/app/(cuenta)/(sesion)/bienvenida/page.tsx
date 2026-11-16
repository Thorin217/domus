import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { BienvenidaForm } from "@/components/auth/BienvenidaForm";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Tu hogar — Domus" };

async function Formulario({ searchParams }: { searchParams: PageProps<"/bienvenida">["searchParams"] }) {
  const sp = await searchParams;
  const codigo = typeof sp.codigo === "string" ? sp.codigo : "";
  const unirse = Boolean(codigo) || sp.unirse === "1";
  return <BienvenidaForm unirseInicial={unirse} codigoInicial={codigo} />;
}

export default function BienvenidaPage({ searchParams }: PageProps<"/bienvenida">) {
  return (
    <div className={styles.page}>
      <BrandPanel titulo="Ya casi." texto="Crea el hogar de tu familia o únete al que ya armaron." />
      <div className={styles.formWrap}>
        <Suspense>
          <Formulario searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
