import { NextResponse } from "next/server";
import { getSession, type Session } from "./session";

/** Route params after validation. `n` (when present) is guaranteed to be a positive integer string. */
type Params = Record<string, string>;

type Handler = (req: Request, ctx: { session: Session; params: Params }) => Promise<Response>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Thrown by handlers to return a 4xx JSON error without logging. */
export class HttpError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
    ) {
        super(code);
    }
}

/** True for a positive integer (as a number or decimal string). */
export function isPositiveInt(value: unknown): boolean {
    if (typeof value === "number") return Number.isSafeInteger(value) && value > 0;
    return typeof value === "string" && /^[1-9]\d{0,15}$/.test(value);
}

/**
 * Reject cross-site state-changing requests. The session cookie is `SameSite=Lax`, which already
 * blocks most CSRF; this is defence in depth using Fetch Metadata and the Origin header.
 */
function isCrossSite(req: Request): boolean {
    const site = req.headers.get("sec-fetch-site");
    if (site) return site !== "same-origin" && site !== "none";
    const origin = req.headers.get("origin");
    if (!origin) return false;
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try {
        return new URL(origin).host !== host;
    } catch {
        return true;
    }
}

/**
 * Wrap an API route handler: requires a valid session, rejects cross-site mutations, validates the
 * `[n]` route param, and turns unexpected errors into a generic 500.
 */
export function withAuth(handler: Handler) {
    return async (req: Request, routeCtx: { params: Promise<Params> }) => {
        if (!SAFE_METHODS.has(req.method) && isCrossSite(req)) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        try {
            const params = (await routeCtx.params) ?? {};
            if ("n" in params && !isPositiveInt(params.n)) {
                return NextResponse.json({ error: "invalid_pr_number" }, { status: 400 });
            }
            return await handler(req, { session, params });
        } catch (error) {
            if (error instanceof HttpError) {
                return NextResponse.json({ error: error.code }, { status: error.status });
            }
            console.error(error);
            return NextResponse.json({ error: "internal_error" }, { status: 500 });
        }
    };
}

/** Parse a JSON object request body. Missing/invalid bodies yield `{}`. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
    const data: unknown = await req.json().catch(() => null);
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

/** Pass through a GitHub API result as a JSON response. */
export function pass(result: { ok?: boolean; status: number; data: unknown }): Response {
    if (result.status === 204 || result.status === 205 || result.status === 304) {
        return new Response(null, { status: result.status });
    }
    return NextResponse.json(result.data ?? null, { status: result.status });
}
