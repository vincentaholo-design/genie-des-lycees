/**
 * Crée (ou met à jour) un compte d'administration.
 * Usage : npm run admin:create -- email@domaine.tg "Nom Prénom" super_admin
 * Le mot de passe est demandé de façon interactive (12 caractères minimum).
 */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db";
import { users, roleEnum } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/crypto";

async function main() {
  const [email, name, role = "super_admin"] = process.argv.slice(2);
  if (!email || !name) {
    console.error('Usage : npm run admin:create -- email@domaine.tg "Nom Prénom" [rôle]');
    process.exit(1);
  }
  if (!roleEnum.enumValues.includes(role as never)) {
    console.error(`Rôle inconnu. Rôles possibles : ${roleEnum.enumValues.join(", ")}`);
    process.exit(1);
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const password = process.env.ADMIN_PASSWORD ?? (await rl.question("Mot de passe (12 caractères min.) : "));
  rl.close();
  if (password.length < 12) {
    console.error("Mot de passe trop court.");
    process.exit(1);
  }
  process.env.SEED_DEMO ??= "false";
  const db = await getDb();
  const passwordHash = await hashPassword(password);
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing.length) {
    await db.update(users).set({ name, role: role as never, passwordHash, active: true }).where(eq(users.email, email.toLowerCase()));
    console.log(`✔ Compte ${email} mis à jour (${role}).`);
  } else {
    await db.insert(users).values({ email: email.toLowerCase(), name, role: role as never, passwordHash });
    console.log(`✔ Compte ${email} créé (${role}).`);
  }
  await closeDb();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
