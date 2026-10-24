import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "isd_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Session {
    token: string;
    login: string;
    name: string | null;
    avatarUrl: string;
}

function key(): Buffer {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is not set");
    // Accept a 64-char hex string or any arbitrary passphrase.
    if (/^[0-9a-f]{64}$/i.test(secret)) return Buffer.from(secret, "hex");
    return createHash("sha256").update(secret).digest();
}

export function seal(data: Session): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);
    const plaintext = Buffer.from(JSON.stringify(data), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unseal(value: string): Session | null {
    try {
        const raw = Buffer.from(value, "base64url");
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const encrypted = raw.subarray(28);
        const decipher = createDecipheriv("aes-256-gcm", key(), iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return JSON.parse(decrypted.toString("utf8")) as Session;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<Session | null> {
    const store = await cookies();
    const cookie = store.get(COOKIE_NAME);
    if (!cookie?.value) return null;
    return unseal(cookie.value);
}

export async function setSession(session: Session, secure?: boolean): Promise<void> {
    const store = await cookies();
    store.set(COOKIE_NAME, seal(session), {
        httpOnly: true,
        sameSite: "lax",
        secure: secure ?? process.env.NODE_ENV === "production",
        maxAge: MAX_AGE,
        path: "/",
    });
}

export async function clearSession(): Promise<void> {
    const store = await cookies();
    store.delete(COOKIE_NAME);
}
