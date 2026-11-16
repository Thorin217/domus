# Domus — DESIGN.md (v2)

Sistema de diseño de **Domus**, la app para llevar los gastos, gastos fijos, quehaceres y premios y castigos de la familia.
Dirección: **profesional, sobria y clara**. Fondos blancos, azules profundos, un único acento amarillo y contraste alto. La estructura (radios, bordes, sombras, jerarquía tipográfica) sigue el sistema de referencia adjunto (estilo Kraken), adaptado a la paleta de Domus.

---

## 1. Atmósfera

- Superficies blancas con borde fino (`1px #DEDEE5`) y sombra casi invisible.
- El color se usa con intención: **Steel Azure** para la acción principal, **amarillo** como acento puntual, **verde** para lo logrado y **rojo** solo para atrasos y castigos.
- Tipografía grande, en negrita y con tracking negativo para los titulares; texto de interfaz neutro y legible.
- Sin decoración infantil: nada de píldoras, formas flotantes, caras ni colores de fondo saturados en tarjetas.

---

## 2. Logo

- **Isotipo:** una casa de líneas rectas partida en dos tonos (lo individual y lo compartido) con una puerta amarilla en arco. Esquinas inferiores levemente redondeadas.
- **Wordmark:** "Domus" en Inter Display Bold, convertido a curvas (no depende de fuentes instaladas).
- **Colores:** imperial blue `#00296B` + steel azure `#00509D` + puerta `#FDC500`. Sobre fondo oscuro la casa pasa a `#F5F7FA` + `#8DB7E8`.

| Situación | Archivo |
|---|---|
| Fondo claro | `domus-logo-horizontal.svg` |
| Fondo oscuro | `domus-logo-horizontal-dark.svg` (con fondo) / `-transparent-dark.svg` |
| Espacios cuadrados o verticales | `domus-logo-stacked.svg` / `-stacked-dark.svg` |
| Avatar, favicon, ícono pequeño | `domus-mark.svg` (claro), `domus-mark-on-dark.svg` |
| Una sola tinta | `domus-mark-mono-ink.svg`, `domus-mark-mono-white.svg` |
| Solo texto | `domus-wordmark.svg`, `domus-wordmark-white.svg` |
| Ícono de app | `domus-app-icon-imperial.svg` (principal), `-yellow`, `-azure` |
| Favicon | `domus-favicon.svg` (PNG 32 y 256) |

**Zona de respeto:** al menos la altura de la "D" alrededor. **Mínimo:** horizontal 110 px de ancho, isotipo 20 px.
**No hacer:** cambiar colores, estirar, agregar sombras o contornos, usar el isotipo claro sobre azul oscuro (o viceversa).

---

## 3. Color

### Paleta de marca
| Token | Hex | Uso |
|---|---|---|
| `imperial-blue` | `#00296B` | Fondos oscuros, titulares clave, Papá |
| `french-blue` | `#003F88` | Hover, bordes de botón secundario, texto sobre tinte azul |
| `steel-azure` | `#00509D` | **Acción principal**, enlaces, gráficas, Mamá |
| `school-bus-yellow` | `#FDC500` | Acento: puerta del logo, botón sobre oscuro, estrellas, Sofía |
| `gold` | `#FFD500` | Destacados puntuales |

### Color nuevo
| Token | Hex | Uso |
|---|---|---|
| `success` | `#149E61` | Quehacer hecho, check, estados positivos |
| `success-text` | `#026B3F` | Texto de badge de éxito |

### Neutros y derivados
| Token | Hex | Uso |
|---|---|---|
| `text` | `#101114` | Texto principal |
| `text-muted` | `#686B82` | Texto secundario (5.2:1 sobre blanco) |
| `border` | `#DEDEE5` | Bordes de tarjeta, divisores, inputs |
| `border-soft` | `#EEF0F5` | Filas de tabla, pistas de progreso |
| `bg` | `#F5F6FA` | Fondo de la app y de secciones alternas |
| `surface` | `#FFFFFF` | Tarjetas, sidebar, inputs |
| `brand-tint` | `#E6EEF7` | Fondo de badge/botón sutil azul |
| `sky` | `#8DB7E8` | Mateo; casa sobre fondo oscuro; línea sobre oscuro |
| `yellow-tint` | `#FFF3C4` (texto `#6B5200`) | Badge de gasto fijo, puntos, premios |
| `success-tint` | `#E3F4EC` | Badge hecho |
| `danger` | `#C4314B` | Atraso, castigo (tinte `#FBE9EC`, texto `#9B1C33`) |
| `gray-tint` | `#F2F3F7` (texto `#484B5E`) | Badge neutro, "Personal", "Pendiente" |

### Reglas de contraste
- Texto blanco sobre `steel-azure`, `french-blue` e `imperial-blue`. Texto `imperial-blue` sobre `school-bus-yellow` y sobre tintes claros.
- `text-muted` solo sobre blanco, `bg` y tintes claros. Nunca para texto pequeño sobre azul.
- Estados con más que color: hecho = check, no se hizo = icono de cruz, pendiente = círculo vacío.
- Gráficas: una sola serie en `steel-azure`; para comparar integrantes, el color de cada uno (variantes oscurecidas del amarillo y del cielo para que la barra se lea sobre `#EEF0F5`).

### Integrantes
Color fijo en toda la app (avatar, barras, votos): **Mamá** `#00509D` (texto blanco) · **Papá** `#00296B` (texto blanco) · **Sofía** `#FDC500` (texto `#00296B`) · **Mateo** `#8DB7E8` (texto `#00296B`). Más de cuatro integrantes: repetir con borde de 2 px `imperial-blue`.

---

## 4. Tipografía

**IBM Plex Sans** en todo (equivalente abierto de la pareja Kraken-Brand / Kraken-Product). Google Fonts: `IBM+Plex+Sans:wght@400;500;600;700`. Fallbacks: `Helvetica, Arial, sans-serif`.

| Rol | Tamaño | Peso | Interlineado | Tracking |
|---|---|---|---|---|
| Hero | 48–56 px | 700 | 1.10–1.17 | -1px |
| Titular de sección | 36 px | 700 | 1.22 | -0.5px |
| Subtítulo / H1 de página | 28 px | 700 | 1.29 | -0.5px |
| Título de tarjeta | 17–20 px | 600 | 1.2 | 0 |
| Cifra destacada | 30–32 px | 700 | 1.1 | -0.5px |
| Cuerpo | 16 px | 400 | 1.5 | 0 |
| Botón | 15–16 px | 600 | 1.38 | 0 |
| Etiqueta / tabla | 13–14 px | 500–600 | 1.4 | 0 |
| Badge | 12 px | 600 | 1.2 | 0 |

Mínimo 12 px (solo badges y metadatos). Cuerpo de lectura: 16 px o más.

---

## 5. Forma, espacio y profundidad

- **Radios:** botones y campos **12 px** · tarjetas **16 px** · badges **6 px** · control segmentado 12 px (opción interna 9 px) · avatares 50 %. **Sin píldoras (999 px)** salvo barras de progreso.
- **Espaciado:** escala 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56. Padding de tarjeta 20–24 px. Contenedor máximo 1200 px.
- **Bordes:** 1 px `border` en tarjetas e inputs; 2 px `steel-azure` en el campo enfocado.
- **Elevación:** tarjeta `0 4px 24px rgba(0,0,0,0.03)`; opción activa de control segmentado `0 1px 4px rgba(16,24,40,0.06)`. Nada más pesado.
- **Íconos:** trazo de 2 px, extremos y uniones redondeados, 20–22 px, `currentColor`. Sin emojis.
- **Decoración:** ninguna. Los paneles de marca (login, CTA) son color liso `imperial-blue`.

---

## 6. Componentes

### Botones (alto mín. 44 px, radio 12, `13px 16px`, 600)
| Variante | Estilo |
|---|---|
| Primario | fondo `#00509D`, texto blanco |
| Contorno | fondo blanco, borde 1 px `#003F88`, texto `#003F88` |
| Sutil | fondo `#E6EEF7`, texto `#00509D` |
| Secundario | fondo `#F2F3F7`, texto `#101114` |
| Acento | fondo `#FDC500`, texto `#00296B` (sobre fondo oscuro y acciones de premio) |

Foco visible: contorno 2 px `#00509D`, offset 2 px.

### Campos
Etiqueta encima (14 px, 600). Input 44–48 px, borde 1 px `#DEDEE5`, radio 12, texto 16 px. Foco: borde 2 px `#00509D`. Siempre `<label>` asociada.

### Control segmentado
Contenedor `#F5F6FA` radio 12, padding 3. Opción activa: fondo blanco, texto `#101114`, sombra mínima. (En barras de filtro puede usarse fondo `#E6EEF7` con texto `#00509D`.)

### Badges (radio 6, 12 px, 600)
Familiar `#E6EEF7/#003F88` · Personal `#F2F3F7/#484B5E` · Fijo `#FFF3C4/#6B5200` · Hecho `#E3F4EC/#026B3F` · Atraso `#FBE9EC/#9B1C33`.

### Tarjeta
Blanca, borde 1 px, radio 16, sombra mínima, padding 20–24. Indicador: etiqueta 14 px `text-muted`, cifra 30 px 700, badge de contexto.

### Tabla
Cabecera 13 px 600 `text-muted` con línea inferior `border`; filas con separador `border-soft`; celdas 14 px, padding `12px`; montos alineados a la derecha en 600. Contenedor con `overflow-x: auto`.

### Progreso
Pista `#EEF0F5` de 6–8 px con relleno `#00509D` (o el color del integrante). Radio completo.

### Casilla de quehacer
Hecho: círculo `#149E61` con check blanco. Pendiente: círculo con borde 2 px `#9497A9`. Área táctil de 44 px.

### Calificación
Cinco estrellas de 28 px, rellenas `#FDC500` con borde `#C99A00`; vacías blancas con borde `#7D8199`. Cada una es un botón de 44 px con `aria-label` ("3 estrellas").

### Navegación lateral
Sidebar blanca con borde derecho; ítems de 44 px, radio 10, icono + texto. Activo: fondo `#E6EEF7`, texto `#00509D`, 600. Al pie, tarjeta del hogar con avatares.

---

## 7. Pantallas

| # | Pantalla | Contenido |
|---|---|---|
| 1 | Marca y componentes | Logo, paleta, tipografía, componentes |
| 2 | Landing | Nav, hero con vista previa del producto, 4 funciones, quehaceres, premios y castigos, CTA, pie |
| 3 | Login | Panel `imperial-blue` con propuesta de valor + formulario (correo, contraseña, código familiar) |
| 4 | Dashboard | Indicadores del mes, gasto por categoría e integrante, tabla de compras, gastos fijos próximos, hoy en casa |
| 5 | Quehaceres | Horario semanal por integrante, hoy, cumplimiento, asignar tarea |
| 6 | Premios y castigos | Reglas, clasificación, calificar a los demás, catálogo de premios, castigos, votación |

**Responsivo:** páginas fluidas con contenedor de 1200 px y bloques `flex-wrap`; la sidebar se apila sobre el contenido en pantallas estrechas; tablas y el horario semanal se desplazan en horizontal dentro de su tarjeta.

---

## 8. Reglas del producto

- **Compra:** concepto, monto, categoría, fecha, quién pagó, tipo Familiar o Personal. **Gasto fijo:** se repite cada mes con fecha de vencimiento y aviso previo. Presupuesto mensual del hogar; moneda USD.
- **Quehacer:** horario semanal por integrante (tarea, día, puntos). Estados: hecho, pendiente, no se hizo. Marcar hecho suma puntos.
- **Calificación:** nadie se califica a sí mismo; los demás puntúan de 1 a 5 con comentario opcional.
- **Resultado semanal:** promedio **≥ 4.0** habilita canjear un premio; **< 2.5** abre una votación para un castigo del catálogo. Canjear y aplicar requieren voto de la familia. El catálogo lo propone y aprueba la familia.

---

## 9. Accesibilidad

- Contraste mínimo 4.5:1 en texto (3:1 desde 24 px y en gráficos).
- Elementos reales (`button`, `a`, `input` + `label`), objetivo mínimo 44 × 44 px, foco visible.
- Íconos decorativos con `aria-hidden`; botones solo con ícono llevan `aria-label`.
- Ningún estado depende solo del color. Idioma del documento: `es`.

---

## 10. Tokens (CSS)

```css
:root {
  /* marca */
  --imperial-blue: #00296B;  --french-blue: #003F88;  --steel-azure: #00509D;
  --school-bus-yellow: #FDC500;  --gold: #FFD500;

  /* semánticos */
  --success: #149E61;  --success-text: #026B3F;  --success-tint: #E3F4EC;
  --danger: #C4314B;   --danger-text: #9B1C33;    --danger-tint: #FBE9EC;
  --yellow-tint: #FFF3C4;  --yellow-text: #6B5200;
  --brand-tint: #E6EEF7;   --sky: #8DB7E8;

  /* neutros */
  --text: #101114;  --text-muted: #686B82;
  --border: #DEDEE5;  --border-soft: #EEF0F5;
  --bg: #F5F6FA;  --surface: #FFFFFF;  --gray-tint: #F2F3F7;

  /* tipografía */
  --font: 'IBM Plex Sans', Helvetica, Arial, sans-serif;

  /* forma y profundidad */
  --radius-control: 12px;  --radius-card: 16px;  --radius-badge: 6px;
  --shadow-card: 0 4px 24px rgba(0,0,0,0.03);
  --shadow-micro: 0 1px 4px rgba(16,24,40,0.06);

  /* espacio */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px;
}
```

---

## 11. Archivos

```
domus-logos/
  DESIGN.md
  svg/   15 logos vectoriales
  png/   versiones listas (1600 px de ancho; íconos de app 1024 y 180; favicon 32 y 256)
```

---

## 12. Implementación en este repo

- Tokens en `src/app/globals.css` con los nombres de §10 (`--steel-azure`, `--text-muted`, `--border`…) más alias de rol que usan los módulos (`--primary`, `--surface`, `--hairline`, `--muted`).
- IBM Plex Sans vía `next/font` (`--font-plex`) en `src/app/layout.tsx`.
- Logo: `src/components/Logo.tsx` (`Logo` + `Isotipo`, variantes `light`/`dark`); archivos en `public/brand/`; favicon `src/app/icon.svg`; `src/app/apple-icon.png` = `domus-app-icon-imperial-180.png`.
- Colores de integrante: `PALETA_INTEGRANTES` en `src/lib/hogar/types.ts` (Mamá/Papá/Sofía/Mateo = índices 0–3; desde el 5.º se repite con borde imperial).
- Botones de `ui.module.css`: `primario` (steel azure), `secundario` (contorno french blue), `azul` (sutil), `suave` (gris), `acento` (amarillo), `oscuro` (imperial), `peligro`.
