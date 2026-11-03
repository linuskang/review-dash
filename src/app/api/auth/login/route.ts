import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, shouldUseSecureCookies } from "@/lib/session";

export async function GET(req: Request) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: "GITHUB_CLIENT_ID is not configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const redirectUri = process.env.OAUTH_REDIRECT_URL || `${url.origin}/api/auth/callback`;
    const state = randomBytes(32).toString("hex");

    const store = await cookies();
    store.set(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookies(req),
        maxAge: 600,
        path: "/api/auth",
    });

    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    // `repo` is required to review, label, comment on, merge PRs and approve workflow runs.
    authorize.searchParams.set("scope", "repo");
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("allow_signup", "false");

    return NextResponse.redirect(authorize.toString());
}
