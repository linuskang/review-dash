import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "isd_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Short-lived cookie holding the OAuth `state` nonce, scoped to `/api/auth`. */
export const OAUTH_STATE_COOKIE = "isd_oauth_state";

export interface Session {
    token: string;
    login: string;
    name: string | null;
    avatarUrl: string;
}

const MIN_SECRET_LENGTH = 32;

function key(): Buffer {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is not set");
    if (secret.length < MIN_SECRET_LENGTH) {
        throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters (try: openssl rand -hex 32)`);
    }
    // Accept a 64-char hex string (used directly as the key) or any long passphrase (hashed).
    if (/^[0-9a-f]{64}$/i.test(secret)) return Buffer.from(secret, "hex");
    return createHash("sha256").update(secret).digest();
}

function isSession(value: unknown): value is Session {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.token === "string" &&
        typeof v.login === "string" &&
        typeof v.avatarUrl === "string" &&
        (v.name === null || typeof v.name === "string")
    );
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
    const secretKey = key();
    try {
        const raw = Buffer.from(value, "base64url");
        if (raw.length <= 28) return null;
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const encrypted = raw.subarray(28);
        const decipher = createDecipheriv("aes-256-gcm", secretKey, iv, { authTagLength: 16 });
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const parsed: unknown = JSON.parse(decrypted.toString("utf8"));
        return isSession(parsed) ? parsed : null;
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

/** Cookies are `Secure` in production and whenever the request itself arrived over HTTPS. */
export function shouldUseSecureCookies(req: Request): boolean {
    return process.env.NODE_ENV === "production" || new URL(req.url).protocol === "https:";
}

export async function setSession(session: Session, secure: boolean): Promise<void> {
    const store = await cookies();
    store.set(COOKIE_NAME, seal(session), {
        httpOnly: true,
        sameSite: "lax",
        secure,
        maxAge: MAX_AGE,
        path: "/",
    });
}

export async function clearSession(): Promise<void> {
    const store = await cookies();
    store.delete(COOKIE_NAME);
}
