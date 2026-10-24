import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: "GITHUB_CLIENT_ID is not configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const redirectUri = process.env.OAUTH_REDIRECT_URL || `${url.origin}/api/auth/callback`;
    const state = randomBytes(16).toString("hex");

    const store = await cookies();
    store.set("isd_oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 600,
        path: "/",
    });

    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    // repo: read/write PRs, reviews, labels, comments, merge; needed for approving workflow runs too.
    authorize.searchParams.set("scope", "repo");
    authorize.searchParams.set("state", state);

    return NextResponse.redirect(authorize.toString());
}
