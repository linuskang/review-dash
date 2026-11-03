import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { gh } from "@/lib/github";
import { clearSession } from "@/lib/session";

export const GET = withAuth(async (_req, { session }) => {
    // Detect an expired/revoked GitHub token so the client can re-authenticate.
    const check = await gh(session.token, "/user");
    if (!check.ok) {
        if (check.status === 401) await clearSession();
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
        login: session.login,
        name: session.name,
        avatarUrl: session.avatarUrl,
    });
});
