import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { gh, hasRepoAccess } from "@/lib/github";
import { setSession } from "@/lib/session";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const store = await cookies();
    const expectedState = store.get("isd_oauth_state")?.value;
    store.delete("isd_oauth_state");

    if (!code || !state || !expectedState || state !== expectedState) {
        return NextResponse.redirect(new URL("/login?error=state", url.origin));
    }

    // Exchange the code for an access token.
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.OAUTH_REDIRECT_URL || `${url.origin}/api/auth/callback`,
        }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
        return NextResponse.redirect(new URL("/login?error=token", url.origin));
    }
    const token = tokenData.access_token;

    // Who is this?
    const userRes = await gh(token, "/user");
    if (!userRes.ok) {
        return NextResponse.redirect(new URL("/login?error=user", url.origin));
    }
    const user = userRes.data as { login: string; name: string | null; avatar_url: string };

    // Gate: must have push (maintainer) access to the register repo.
    if (!(await hasRepoAccess(token))) {
        return NextResponse.redirect(new URL(`/login?error=permission&user=${user.login}`, url.origin));
    }

    await setSession(
        { token, login: user.login, name: user.name, avatarUrl: user.avatar_url },
        url.protocol === "https:",
    );
    return NextResponse.redirect(new URL("/", url.origin));
}
