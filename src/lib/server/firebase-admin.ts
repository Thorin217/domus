import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApp, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Credenciales del Admin SDK, en este orden:
 * 1. FIREBASE_SERVICE_ACCOUNT con el JSON (producción). Basta con project_id,
 *    client_email y private_key: ver scripts/netlify-env.mjs.
 * 2. FIREBASE_SERVICE_ACCOUNT_PATH o ./service-account.json (desarrollo local).
 */
function cargarCredenciales(): ServiceAccount {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) return JSON.parse(json);
  const ruta = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? path.join(process.cwd(), "service-account.json");
  return JSON.parse(readFileSync(/*turbopackIgnore: true*/ ruta, "utf8"));
}

function app() {
  return getApps().length ? getApp() : initializeApp({ credential: cert(cargarCredenciales()) });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
