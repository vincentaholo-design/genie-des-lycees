import "server-only";
import { getDb } from "@/lib/db";
import { assertProductionSecrets, env } from "@/lib/env";
import { sendEmail, sendSms, verifyCaptcha } from "@/lib/notify";
import { createVoteService } from "./service";

export async function voteService() {
  assertProductionSecrets();
  const db = await getDb();
  return createVoteService({ db, demoMode: env.demoMode, sendEmail, sendSms, verifyCaptcha: (t) => verifyCaptcha(t) });
}
