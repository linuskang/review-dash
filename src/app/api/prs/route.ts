import { NextResponse } from "next/server";
import { withAuth, pass } from "@/lib/api";
import { ghPaginate, REPO } from "@/lib/github";

/** Open PRs, oldest first. */
export const GET = withAuth(async (_req, { session }) => {
    const prs = await ghPaginate(
        session.token,
        `/repos/${REPO}/pulls?state=open&sort=created&direction=asc`,
        3,
    );
    const slim = (prs as Record<string, unknown>[]).map((pr) => {
        const user = pr.user as { login: string; avatar_url: string };
        return {
            number: pr.number,
            title: pr.title,
            author: user?.login,
            avatarUrl: user?.avatar_url,
            createdAt: pr.created_at,
            draft: pr.draft,
            labels: ((pr.labels as { name: string; color: string }[]) || []).map((l) => ({
                name: l.name,
                color: l.color,
            })),
        };
    });
    return pass({ ok: true, status: 200, data: slim }) as ReturnType<typeof NextResponse.json>;
});
