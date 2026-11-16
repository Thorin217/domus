/**
 * Netlify Scheduled Function: llama al cron de avisos una vez al día.
 * Netlify programa en UTC: 13:00 UTC = 7:00 en El Salvador (UTC-6, sin horario de verano).
 * Netlify define `URL` (la dirección principal del sitio); CRON_SECRET viene de las variables del sitio.
 */
export default async function avisosDiarios() {
  const base = process.env.URL;
  const secreto = process.env.CRON_SECRET;
  if (!base || !secreto) {
    console.error("avisos-diarios: faltan URL o CRON_SECRET");
    return;
  }
  const r = await fetch(`${base}/api/cron/avisos`, { headers: { Authorization: `Bearer ${secreto}` } });
  const texto = await r.text();
  if (!r.ok) throw new Error(`avisos-diarios: ${r.status} ${texto.slice(0, 200)}`);
  console.log("avisos-diarios:", texto);
}

export const config = { schedule: "0 13 * * *" };
