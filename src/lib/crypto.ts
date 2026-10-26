import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { applyPlatformEnv } from "./platform-env";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function secret() {
  applyPlatformEnv();
  return process.env.APP_SECRET ?? "dev-only-secret-change-me-dev-only-secret";
}

/** Hachage de mot de passe (scrypt, sel aléatoire). Format : scrypt$N$sel$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const hash = await scryptAsync(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    ...SCRYPT,
    N: Number(n),
  });
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Empreinte à clé secrète : permet de comparer sans stocker la valeur en clair. */
export function hmac(value: string, purpose: string): string {
  return createHmac("sha256", `${secret()}:${purpose}`).update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomDigits(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += randomInt(0, 10).toString();
  return out;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Empreinte d'adresse IP (jamais stockée en clair). */
export function ipFingerprint(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return hmac(ip, "ip").slice(0, 32);
}
