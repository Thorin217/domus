import { Suspense } from "react";
import type { Metadata } from "next";
import { FamiliaPanel } from "@/components/app/FamiliaPanel";

export const metadata: Metadata = { title: "Familia — Domus" };

async function Panel({ searchParams }: { searchParams: PageProps<"/familia">["searchParams"] }) {
  const sp = await searchParams;
  return <FamiliaPanel recienCreado={sp.nuevo === "1"} />;
}

export default function FamiliaPage({ searchParams }: PageProps<"/familia">) {
  return (
    <Suspense>
      <Panel searchParams={searchParams} />
    </Suspense>
  );
}
