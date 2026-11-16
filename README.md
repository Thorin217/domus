# Domus

App del hogar: compras, gastos fijos, quehaceres y premios y castigos de la familia.

- **Stack:** Next.js (App Router, TypeScript, CSS Modules) + Firebase (Auth + Firestore).
- **Diseño:** ver `DESIGN.md` (tokens en `src/app/globals.css`). Logos en `public/brand/`.
- **Responsive:** mobile first. Escalones en 600px (tablet) y 960px (escritorio).

## Arrancar

```bash
cp .env.local.example .env.local   # llenar con la config web de Firebase
npm install
npm run dev
```

Para las rutas `/api` hace falta `service-account.json` en la raíz (Firebase Console →
Configuración → Cuentas de servicio → Generar clave). Nunca se sube a git.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run rules:deploy` | Publica `firestore.rules` con la cuenta de servicio (sin `firebase login`) |
| `npm run firebase:check` | Verifica que Auth (correo/Google) y Firestore estén activos |

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Landing |
| `/login` | Entrar / Crear cuenta / Google / recuperar contraseña. `?modo=crear&codigo=XXXXXX` viene del enlace de invitación |
| `/bienvenida` | Crear hogar (quedas como admin) o unirte con código |
| `/inicio` | Resumen del hogar |
| `/familia` | Admin del hogar: código, integrantes, roles, ajustes, salir |

## Datos (Firestore)

```
usuarios/{uid}                       { hogarId, nombre }
hogares/{hogarId}                    { nombre, codigo, moneda, presupuestoMensual, creadoPor, integrantes }
hogares/{hogarId}/integrantes/{uid}  { nombre, email, rol: admin|miembro, color, unidoEn }
codigos/{codigo}                     { hogarId }   ← solo servidor
```

**Seguridad:** el cliente solo lee (y solo su hogar). Toda escritura pasa por `/api/hogar/*`,
que verifica el token y el rol con el Admin SDK, en transacciones. Reglas en `firestore.rules`.

Reglas del admin del hogar: quien crea el hogar es admin; puede haber varios admins y siempre
al menos uno; el admin regenera el código (el anterior deja de servir), cambia roles, quita
integrantes y edita nombre y presupuesto. Si el último integrante sale, el hogar se borra.

## Estructura

```
src/app/page.tsx                    Landing
src/app/(cuenta)/layout.tsx         AuthProvider único para login, bienvenida y app
src/app/(cuenta)/(sesion)/          /login, /bienvenida
src/app/(cuenta)/(app)/             /inicio, /familia (con AppShell)
src/app/api/hogar/                  Rutas del servidor (Admin SDK)
src/components/app/                 AppShell (menú), Resumen, FamiliaPanel
src/components/auth/                AuthProvider, LoginForm, BienvenidaForm
src/components/ui/                  Botones, campos, avatares, Sheet (hoja inferior)
src/lib/firebase.ts                 Firebase cliente
src/lib/server/                     Firebase Admin + helpers de API (solo servidor)
src/lib/hogar/                      Tipos, colores por integrante, useHogar
```

## Notificaciones (Web Push)

Domus envía los avisos al teléfono con Web Push estándar y claves VAPID propias. Es gratis y no usa FCM ni la consola de Firebase.

**Variables (en `.env.local` y en producción):**

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID (va al navegador) |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID. **Secreta** |
| `VAPID_SUBJECT` | `mailto:tu-correo` o `https://tu-dominio`. Los servicios push lo usan para contactarte |
| `CRON_SECRET` | Token para llamar al cron. **Secreto** |
| `DOMUS_ZONA` | Zona horaria del "hoy" (ej. `America/El_Salvador`) |

Las claves nuevas se generan con `npx web-push generate-vapid-keys`. Si cambias las claves, todos tienen que volver a activar los avisos.

**Avisos inmediatos:** tareas asignadas, horario repartido, calificaciones, votaciones, acusaciones y defensas. Salen solos al usar la app.

**Avisos programados:** tareas de hoy, gastos fijos por vencer o atrasados y plazos de acusaciones. Necesitan que algo llame una vez al día (de preferencia temprano):

```
GET /api/cron/avisos
Authorization: Bearer $CRON_SECRET
```

No repite en el mismo día. `?forzar=1` salta esa protección para pruebas.

Por ejemplo, con crontab en el droplet, todos los días a las 7:00:

```
0 7 * * * curl -fsS -H "Authorization: Bearer TU_CRON_SECRET" https://tu-dominio/api/cron/avisos > /dev/null
```

Alternativas: un workflow de GitHub Actions con `schedule`, o Vercel Cron (Vercel manda el mismo header `Authorization: Bearer $CRON_SECRET`).

**Requisitos:** HTTPS en producción (en `localhost` funciona sin él). En iPhone, Domus tiene que estar en la pantalla de inicio (iOS 16.4 o más nuevo). En incógnito no funciona.

## Despliegue en Netlify

1. `node scripts/netlify-env.mjs` genera `.env.netlify` (fuera de git, permisos 600) con todas las variables. La cuenta de servicio va recortada a 3 campos para caber en el límite de ~4 KB de variables de las funciones.
2. En Netlify: *Site configuration → Environment variables → Import from a .env file* y pega el contenido. Después cambia el alcance de las `NEXT_PUBLIC_*` a solo **Builds**.
3. `netlify.toml` ya tiene el build. Netlify detecta Next.js solo.
4. Los avisos diarios los manda `netlify/functions/avisos-diarios.mts` (Scheduled Function, `0 13 * * *` UTC = 7:00 en El Salvador). No hace falta crontab.
5. En Firebase → Authentication → Settings → **Dominios autorizados**, agrega el dominio de Netlify (`*.netlify.app` o el tuyo).

Los avisos inmediatos se envían antes de responder (no con `after()`), porque en serverless el trabajo posterior a la respuesta se puede cortar.
