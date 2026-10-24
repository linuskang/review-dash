import { NextResponse } from "next/server";
import { withAuth, pass } from "@/lib/api";
import { gh, ghPaginate, REPO } from "@/lib/github";

/** Open PRs, oldest first. */
export const GET = withAuth(async (_req, { session }) => {
    const prs = await ghPaginate(
        session.token,
        `/repos/${REPO}/pulls?state=open&sort=created&direction=asc`,
        3,
    );
    const slim = await Promise.all(
        (prs as Record<string, unknown>[]).map(async (pr) => {
            const user = pr.user as { login: string; avatar_url: string };
            const head = pr.head as { sha: string };
            let checks: { total: number; passed: number; failed: number; pending: number } | undefined;
            let commentsCount = 0;
            try {
                const res = await gh<{ check_runs?: { id: number; name: string; status: string; conclusion: string | null }[] }>(
                    session.token,
                    `/repos/${REPO}/commits/${head?.sha}/check-runs`,
                );
                const raw = (res.data?.check_runs ?? []) as { id: number; name: string; status: string; conclusion: string | null }[];
                // Keep only the most recent run per name (reruns create new check runs).
                const latest = new Map<string, { id: number; name: string; status: string; conclusion: string | null }>();
                for (const r of raw) {
                    const prev = latest.get(r.name);
                    if (!prev || r.id > prev.id) latest.set(r.name, r);
                }
                const runs = Array.from(latest.values());
                checks = {
                    total: runs.length,
                    passed: runs.filter(
                        (r) =>
                            r.status === "completed" &&
                            ["success", "neutral", "skipped"].includes(r.conclusion ?? ""),
                    ).length,
                    failed: runs.filter(
                        (r) =>
                            r.status === "completed" &&
                            !!r.conclusion &&
                            !["success", "neutral", "skipped"].includes(r.conclusion),
                    ).length,
                    pending: runs.filter((r) => r.status !== "completed").length,
                };
            } catch {
                checks = undefined;
            }
            try {
                const cmts = await ghPaginate(session.token, `/repos/${REPO}/issues/${pr.number}/comments`, 2);
                commentsCount = cmts.length;
            } catch {
                commentsCount = 0;
            }
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
                commentsCount,
                checks,
            };
        }),
    );
    return pass({ ok: true, status: 200, data: slim }) as ReturnType<typeof NextResponse.json>;
});
