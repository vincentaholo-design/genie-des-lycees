import "server-only";
import { applyPlatformEnv } from "./platform-env";

applyPlatformEnv();

/**
 * Configuration lue côté serveur uniquement. Aucune de ces valeurs n'est exposée au navigateur.
 * Les services externes ne sont considérés comme actifs que si leurs clés sont présentes.
 */
const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  appSecret: process.env.APP_SECRET ?? DEV_SECRET,
  /** Le mode démo autorise l'affichage des codes de vérification à l'écran faute de fournisseur. */
  /* Par défaut : actif sans base PostgreSQL, ou tant qu'aucun fournisseur d'e-mail ni de SMS n'est configuré
     (sinon personne ne pourrait recevoir de code de vote). Mettre DEMO_MODE=false en production réelle. */
  demoMode: process.env.DEMO_MODE
    ? process.env.DEMO_MODE === "true"
    : !process.env.DATABASE_URL || !(process.env.RESEND_API_KEY || process.env.SMS_WEBHOOK_URL),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseBucketPublic: process.env.SUPABASE_BUCKET_PUBLIC ?? "public-media",
  supabaseBucketPrivate: process.env.SUPABASE_BUCKET_PRIVATE ?? "dossiers",
  resendApiKey: process.env.RESEND_API_KEY,
  mailFrom: process.env.MAIL_FROM ?? "Génie des Lycées <no-reply@example.org>",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
  smsWebhookUrl: process.env.SMS_WEBHOOK_URL,
  smsWebhookToken: process.env.SMS_WEBHOOK_TOKEN,
};

export function assertProductionSecrets() {
  if (env.isProd && env.appSecret === DEV_SECRET && !env.demoMode) {
    throw new Error("APP_SECRET doit être défini en production (32 caractères minimum).");
  }
}

export const services = {
  database: env.databaseUrl ? "postgres" : "pglite",
  storage: env.supabaseUrl && env.supabaseServiceRoleKey ? "supabase" : "local",
  email: env.resendApiKey ? "resend" : "non_configure",
  sms: env.smsWebhookUrl ? "webhook" : "non_configure",
  captcha: env.turnstileSecret && env.turnstileSiteKey ? "turnstile" : "non_configure",
} as const;
