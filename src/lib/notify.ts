import "server-only";
import { env, services } from "@/lib/env";

/**
 * Envoi d'e-mails et de SMS.
 * - E-mail : Resend (RESEND_API_KEY). Sans clé : non configuré.
 * - SMS : webhook HTTP générique (SMS_WEBHOOK_URL) vers le fournisseur de votre choix.
 * Aucun envoi n'est simulé en silence : l'appelant reçoit `sent: false` et décide quoi afficher.
 */
export type SendResult = { sent: boolean; reason?: string };

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (services.email !== "resend") return { sent: false, reason: "email_non_configure" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.mailFrom, to, subject, text }),
  });
  return res.ok ? { sent: true } : { sent: false, reason: `resend_${res.status}` };
}

export async function sendSms(to: string, text: string): Promise<SendResult> {
  if (services.sms !== "webhook") return { sent: false, reason: "sms_non_configure" };
  const res = await fetch(env.smsWebhookUrl!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.smsWebhookToken ? { Authorization: `Bearer ${env.smsWebhookToken}` } : {}),
    },
    body: JSON.stringify({ to, text }),
  });
  return res.ok ? { sent: true } : { sent: false, reason: `sms_${res.status}` };
}

/** Vérification Cloudflare Turnstile côté serveur. */
export async function verifyCaptcha(token: string | null | undefined, ip?: string | null): Promise<"ok" | "invalide" | "non_configure"> {
  if (services.captcha !== "turnstile") return "non_configure";
  if (!token) return "invalide";
  const body = new URLSearchParams({ secret: env.turnstileSecret!, response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean };
  return data.success ? "ok" : "invalide";
}
