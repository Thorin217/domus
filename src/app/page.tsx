import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Avatar } from "@/components/ui/Avatar";
import { CalendarIcon, CartIcon, CheckIcon, ChecklistIcon, GiftIcon, Star } from "@/components/Icons";
import styles from "./page.module.css";

const FUNCIONES = [
  {
    titulo: "Compras y gastos",
    texto: "Registra cada compra como familiar o personal y consulta quién gastó qué, por categoría y por mes.",
    Icon: CartIcon,
  },
  {
    titulo: "Gastos fijos",
    texto: "Alquiler, luz, internet y colegio con su fecha de vencimiento y un aviso antes de pagar tarde.",
    Icon: CalendarIcon,
  },
  {
    titulo: "Quehaceres",
    texto: "Un horario semanal por integrante, con tareas, días y puntos por cada una que se cumple.",
    Icon: ChecklistIcon,
  },
  {
    titulo: "Premios y castigos",
    texto: "Los demás califican cada tarea y la familia vota los premios y castigos según el promedio.",
    Icon: GiftIcon,
    acento: true,
  },
];

type Tono = "hecho" | "neutro" | "atraso";
const HORARIO: { nombre: string; color: number; tareas: [string, Tono][] }[] = [
  { nombre: "Mamá", color: 0, tareas: [["Cocinar", "hecho"], ["Compras", "neutro"]] },
  { nombre: "Papá", color: 1, tareas: [["Carro", "hecho"], ["Jardín", "atraso"]] },
  { nombre: "Sofía", color: 2, tareas: [["Platos", "hecho"], ["Su cuarto", "neutro"]] },
  { nombre: "Mateo", color: 3, tareas: [["Basura", "hecho"], ["Mascota", "hecho"]] },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className={styles.main}>
        {/* ---------- Hero con vista previa del producto ---------- */}
        <section className={`${styles.container} ${styles.split} ${styles.hero}`}>
          <div className={styles.texto}>
            <span className={styles.badgeMarca}>Gestión del hogar para toda la familia</span>
            <h1 className={styles.h1}>Los gastos y la rutina de tu casa, en un solo lugar.</h1>
            <p className={styles.lead}>
              Domus registra compras y gastos fijos, organiza los quehaceres de cada integrante y convierte el
              cumplimiento en premios acordados por la familia.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/login?modo=crear" className={`${styles.btn} ${styles.btnPrimary}`}>
                Crear mi hogar
              </Link>
              <a href="#funciones" className={`${styles.btn} ${styles.btnOutline}`}>
                Ver funciones
              </a>
            </div>
          </div>

          <div className={styles.visual} aria-hidden="true">
            <div className={`${styles.panel} ${styles.preview}`}>
              <div className={styles.previewHead}>
                <div className={styles.stack}>
                  <span className={styles.meta}>Noviembre 2026</span>
                  <b className={styles.previewTitle}>Casa Escobar</b>
                </div>
                <span className={styles.badge} data-tono="hecho">
                  Dentro del presupuesto
                </span>
              </div>
              <div className={styles.cifras}>
                <div className={styles.stack}>
                  <span className={styles.meta}>Gastado</span>
                  <span className={styles.cifra}>$1,284.50</span>
                </div>
                <div className={styles.stack}>
                  <span className={styles.meta}>Disponible</span>
                  <span className={`${styles.cifra} ${styles.cifraAzul}`}>$500.00</span>
                </div>
              </div>
              <div className={styles.pista}>
                <div style={{ width: "72%" }} />
              </div>
              <div className={styles.categorias}>
                <div className={styles.fila}>
                  <span>Vivienda y servicios</span>
                  <span>$567.00</span>
                </div>
                <div className={`${styles.pista} ${styles.pistaFina}`}>
                  <div style={{ width: "100%" }} />
                </div>
                <div className={styles.fila}>
                  <span>Supermercado</span>
                  <span>$312.50</span>
                </div>
                <div className={`${styles.pista} ${styles.pistaFina}`}>
                  <div style={{ width: "55%" }} />
                </div>
              </div>
              <div className={styles.hoy}>
                <span className={styles.hoyTitulo}>Hoy en casa</span>
                <div className={styles.tarea}>
                  <span className={styles.checkHecho}>
                    <CheckIcon size={13} strokeWidth={3} />
                  </span>
                  <span className={styles.tareaNombre}>Sacar la basura</span>
                  <span className={styles.meta}>Mateo</span>
                </div>
                <div className={styles.tarea}>
                  <span className={styles.checkPendiente} />
                  <span className={styles.tareaNombre}>Lavar los platos</span>
                  <span className={styles.meta}>Sofía</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Funciones ---------- */}
        <section id="funciones" className={styles.banda}>
          <div className={`${styles.container} ${styles.seccion}`}>
            <div className={styles.sectionHead}>
              <h2 className={styles.h2}>Todo lo que la casa necesita, sin hojas de cálculo.</h2>
              <p className={styles.sub}>
                Cuatro herramientas conectadas entre sí, pensadas para que cada integrante sepa qué le toca y qué se
                gastó.
              </p>
            </div>
            <ul className={styles.funciones}>
              {FUNCIONES.map(({ titulo, texto, Icon, acento }) => (
                <li key={titulo} className={styles.funcion}>
                  <span className={styles.funcionIcon} data-acento={acento ? "true" : undefined}>
                    <Icon size={22} />
                  </span>
                  <h3 className={styles.h3}>{titulo}</h3>
                  <p className={styles.funcionTexto}>{texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Quehaceres ---------- */}
        <section id="quehaceres" className={`${styles.container} ${styles.split} ${styles.seccionSplit}`}>
          <div className={styles.texto}>
            <span className={styles.eyebrow}>Quehaceres</span>
            <h2 className={styles.h2}>Cada integrante sabe qué le toca.</h2>
            <p className={styles.sub}>
              Arma el horario de la semana, asigna días y puntos, y marca lo cumplido. El avance de cada persona se ve
              de un vistazo.
            </p>
            <Link href="/login?modo=crear" className={`${styles.btn} ${styles.btnSutil}`}>
              Ver el horario
            </Link>
          </div>
          <div className={styles.visual} aria-hidden="true">
            <div className={`${styles.panel} ${styles.horario}`}>
              {HORARIO.map((p) => (
                <div key={p.nombre} className={styles.horarioFila}>
                  <Avatar nombre={p.nombre} color={p.color} size={32} />
                  <b className={styles.horarioNombre}>{p.nombre}</b>
                  {p.tareas.map(([t, tono]) => (
                    <span key={t} className={styles.badge} data-tono={tono}>
                      {t}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Premios y castigos ---------- */}
        <section id="premios" className={styles.banda}>
          <div className={`${styles.container} ${styles.split} ${styles.seccionSplit} ${styles.invertido}`}>
            <div className={styles.texto}>
              <span className={styles.eyebrow}>Premios y castigos</span>
              <h2 className={styles.h2}>Los demás califican, la familia decide.</h2>
              <p className={styles.sub}>
                Nadie se califica a sí mismo. Un promedio alto permite canjear un premio y uno bajo abre una votación
                para un castigo acordado de antemano.
              </p>
              <Link href="/login?modo=crear" className={`${styles.btn} ${styles.btnSutil}`}>
                Ver premios
              </Link>
            </div>
            <div className={styles.visual} aria-hidden="true">
              <div className={`${styles.panel} ${styles.calificacion}`}>
                <div className={styles.stack}>
                  <b className={styles.previewTitle}>Mateo lavó el carro</b>
                  <span className={styles.meta}>Calificaciones de la familia</span>
                </div>
                <div className={styles.estrellas}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} filled={n <= 4} size={24} />
                  ))}
                  <span className={styles.promedio}>4.5</span>
                </div>
                <div className={styles.voto}>
                  <Avatar nombre="Mamá" color={0} size={28} />
                  <span>Mamá · 4 estrellas · “Faltó secar las ventanas.”</span>
                </div>
                <div className={styles.voto}>
                  <Avatar nombre="Sofía" color={2} size={28} />
                  <span>Sofía · 5 estrellas · “Quedó impecable.”</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Llamado final ---------- */}
        <section className={`${styles.container} ${styles.ctaWrap}`}>
          <div className={styles.cta}>
            <h2 className={styles.ctaTitulo}>Empieza a ordenar tu hogar hoy.</h2>
            <p className={styles.ctaTexto}>Crea tu hogar, invita a la familia con un código y registra la primera compra.</p>
            <div className={styles.ctaBotones}>
              <Link href="/login?modo=crear" className={`${styles.btn} ${styles.btnAcento}`}>
                Crear mi hogar
              </Link>
              <Link href="/login" className={`${styles.btn} ${styles.btnSobreOscuro}`}>
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <Link href="/" aria-label="Domus, inicio" className={styles.footerLogo}>
            <Logo width={110} />
          </Link>
          <span>Domus · gestión del hogar</span>
        </div>
      </footer>
    </>
  );
}
