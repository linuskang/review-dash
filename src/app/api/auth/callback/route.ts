import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { gh, hasRepoAccess } from "@/lib/github";
import { OAUTH_STATE_COOKIE, setSession, shouldUseSecureCookies } from "@/lib/session";

interface GitHubUser {
    login: string;
    name: string | null;
    avatar_url: string;
}

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function exchangeCode(code: string, redirectUri: string): Promise<string | null> {
    try {
        const res = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri,
            }),
            signal: AbortSignal.timeout(20_000),
            cache: "no-store",
        });
        const data = (await res.json()) as { access_token?: unknown };
        return typeof data.access_token === "string" ? data.access_token : null;
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const fail = (error: string, extra?: Record<string, string>) => {
        const target = new URL("/login", url.origin);
        target.searchParams.set("error", error);
        for (const [k, v] of Object.entries(extra ?? {})) target.searchParams.set(k, v);
        return NextResponse.redirect(target);
    };

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const store = await cookies();
    const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
    store.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth" });

    if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
        return fail("state");
    }

    const redirectUri = process.env.OAUTH_REDIRECT_URL || `${url.origin}/api/auth/callback`;
    const token = await exchangeCode(code, redirectUri);
    if (!token) return fail("token");

    const userRes = await gh<GitHubUser>(token, "/user");
    if (!userRes.ok) return fail("user");
    const user = userRes.data;

    // Gate: must have push (maintainer) access to the target repo.
    if (!(await hasRepoAccess(token))) {
        return fail("permission", { user: user.login });
    }

    await setSession(
        { token, login: user.login, name: user.name, avatarUrl: user.avatar_url },
        shouldUseSecureCookies(req),
    );
    return NextResponse.redirect(new URL("/", url.origin));
}
