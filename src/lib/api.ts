import { NextResponse } from "next/server";
import { getSession, type Session } from "./session";

type Handler = (req: Request, ctx: { session: Session; params: Record<string, string> }) => Promise<Response>;

/** Wrap an API route handler, requiring a valid session cookie. */
export function withAuth(handler: Handler) {
    return async (req: Request, routeCtx: { params: Promise<Record<string, string>> }) => {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        try {
            const params = await routeCtx.params;
            return await handler(req, { session, params });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: "internal_error" }, { status: 500 });
        }
    };
}

/** Pass through a GitHub API result as a JSON response. */
export function pass(result: { ok: boolean; status: number; data: unknown }): Response {
    return NextResponse.json(result.data, { status: result.status });
}
