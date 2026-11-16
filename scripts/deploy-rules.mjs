// Publica firestore.rules usando la cuenta de servicio (sin firebase login).
// Uso: npm run rules:deploy
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

const sa = JSON.parse(readFileSync(new URL("../service-account.json", import.meta.url)));
initializeApp({ credential: cert(sa) });

const source = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const ruleset = await getSecurityRules().releaseFirestoreRulesetFromSource(source);
console.log(`Reglas publicadas en ${sa.project_id}: ${ruleset.name}`);
