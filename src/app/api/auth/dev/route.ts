import { NextResponse } from "next/server";
import { gh, hasRepoAccess } from "@/lib/github";
import { setSession } from "@/lib/session";

/**
 * Dev-only shortcut: sign in with a PAT from the environment instead of OAuth.
 * Enabled only when ALLOW_DEV_TOKEN=1. Never enable in production.
 */
export async function GET(req: Request) {
    if (process.env.ALLOW_DEV_TOKEN !== "1" || !process.env.GITHUB_TOKEN) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Side-effect-free probe so the login page can offer a dev sign-in button.
    if (new URL(req.url).searchParams.has("probe")) {
        return NextResponse.json({ enabled: true });
    }

    const token = process.env.GITHUB_TOKEN;
    const userRes = await gh(token, "/user");
    if (!userRes.ok) {
        return NextResponse.redirect(new URL("/login?error=dev-token", req.url));
    }
    const user = userRes.data as { login: string; name: string | null; avatar_url: string };

    if (!(await hasRepoAccess(token))) {
        return NextResponse.redirect(new URL(`/login?error=permission&user=${user.login}`, req.url));
    }

    const secure = new URL(req.url).protocol === "https:";
    await setSession({ token, login: user.login, name: user.name, avatarUrl: user.avatar_url }, secure);
    return NextResponse.redirect(new URL("/", req.url));
}
