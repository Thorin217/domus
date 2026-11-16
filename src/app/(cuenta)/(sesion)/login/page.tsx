import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { LoginForm } from "@/components/auth/LoginForm";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Entrar — Domus" };

async function Formulario({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const modo = sp.modo === "crear" ? "crear" : "entrar";
  const codigo = typeof sp.codigo === "string" ? sp.codigo : undefined;
  return <LoginForm key={`${modo}-${codigo ?? ""}`} modoInicial={modo} codigo={codigo} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className={styles.page}>
      <BrandPanel titulo="Una sola vista para los gastos y la rutina de tu familia." />
      <div className={styles.formWrap}>
        <Suspense>
          <Formulario searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
