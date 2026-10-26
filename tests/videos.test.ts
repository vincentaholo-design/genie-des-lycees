import { describe, expect, it } from "vitest";
import { readTicket, signTicket } from "@/lib/videos/upload";
import { sniffVideo } from "@/lib/storage";

describe("mise en ligne des vidéos", () => {
  const base = { key: "2026-10/abc.mp4", size: 1000, mime: "video/mp4", mode: "public" as const, name: "a.mp4" };
  it("accepte un ticket signé et valide", () => {
    const t = signTicket({ ...base, exp: Date.now() + 60_000 });
    expect(readTicket(t)?.key).toBe(base.key);
  });
  it("refuse un ticket expiré ou falsifié", () => {
    expect(readTicket(signTicket({ ...base, exp: Date.now() - 1 }))).toBeNull();
    const t = signTicket({ ...base, exp: Date.now() + 60_000 });
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...base, mode: "admin", exp: Date.now() + 60_000 })).toString("base64url");
    expect(readTicket(`${forged}.${sig}`)).toBeNull();
    expect(readTicket(`${body}.x${sig.slice(1)}`)).toBeNull();
  });
  it("reconnaît les vrais formats vidéo par leur signature", () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom0000")]);
    const mov = Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from("ftypqt  0000")]);
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniffVideo(mp4)).toBe("video/mp4");
    expect(sniffVideo(mov)).toBe("video/quicktime");
    expect(sniffVideo(webm)).toBe("video/webm");
    expect(sniffVideo(Buffer.from("ceci n'est pas une vidéo"))).toBeNull();
  });
});
