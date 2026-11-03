import { NextResponse } from "next/server";
import { gh, hasRepoAccess } from "@/lib/github";
import { setSession, shouldUseSecureCookies } from "@/lib/session";

/**
 * Dev-only shortcut: sign in with a PAT from the environment instead of OAuth.
 * Requires ALLOW_DEV_TOKEN=1 and is always disabled when NODE_ENV=production.
 */
function devTokenEnabled(): boolean {
    return (
        process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_TOKEN === "1" && !!process.env.GITHUB_TOKEN
    );
}

export async function GET(req: Request) {
    const token = process.env.GITHUB_TOKEN;
    if (!devTokenEnabled() || !token) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const url = new URL(req.url);
    // Side-effect-free probe so the login page can offer a dev sign-in button.
    if (url.searchParams.has("probe")) {
        return NextResponse.json({ enabled: true });
    }

    const userRes = await gh<{ login: string; name: string | null; avatar_url: string }>(token, "/user");
    if (!userRes.ok) {
        return NextResponse.redirect(new URL("/login?error=dev-token", url.origin));
    }
    const user = userRes.data;

    if (!(await hasRepoAccess(token))) {
        const target = new URL("/login?error=permission", url.origin);
        target.searchParams.set("user", user.login);
        return NextResponse.redirect(target);
    }

    await setSession(
        { token, login: user.login, name: user.name, avatarUrl: user.avatar_url },
        shouldUseSecureCookies(req),
    );
    return NextResponse.redirect(new URL("/", url.origin));
}
