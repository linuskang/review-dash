import { withAuth, pass } from "@/lib/api";
import { gh, ghPaginate, REPO } from "@/lib/github";
import type { QueuePr } from "@/lib/types";

interface GhPull {
    number: number;
    title: string;
    user: { login: string; avatar_url: string } | null;
    head: { sha: string };
    author_association: string;
    created_at: string;
    draft: boolean;
    labels: { name: string; color: string }[];
}

interface GhCheckRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
}

const PASSING = new Set(["success", "neutral", "skipped"]);

/** Name of the CI check that only appears once a maintainer has approved/queued the workflow. */
const REQUIRED_CHECK = "Tests";

async function summarizeChecks(token: string, sha: string): Promise<QueuePr["checks"]> {
    const res = await gh<{ check_runs?: GhCheckRun[] }>(
        token,
        `/repos/${REPO}/commits/${encodeURIComponent(sha)}/check-runs?per_page=100`,
    );
    if (!res.ok) return undefined;

    // Keep only the most recent run per name (reruns create new check runs).
    const latest = new Map<string, GhCheckRun>();
    for (const run of res.data.check_runs ?? []) {
        const prev = latest.get(run.name);
        if (!prev || run.id > prev.id) latest.set(run.name, run);
    }
    const runs = Array.from(latest.values());
    // If check runs exist but the required one hasn't spawned yet, CI is awaiting approval or queued.
    const missing = runs.length > 0 && !latest.has(REQUIRED_CHECK) ? 1 : 0;
    const completed = runs.filter((r) => r.status === "completed");

    return {
        total: runs.length + missing,
        passed: completed.filter((r) => PASSING.has(r.conclusion ?? "")).length,
        failed: completed.filter((r) => r.conclusion && !PASSING.has(r.conclusion)).length,
        pending: runs.length - completed.length + missing,
    };
}

/** Open PRs, oldest first, with CI and comment summaries. */
export const GET = withAuth(async (_req, { session }) => {
    const [prs, issues] = await Promise.all([
        ghPaginate<GhPull>(session.token, `/repos/${REPO}/pulls?state=open&sort=created&direction=asc`, 3),
        // The issues endpoint includes PRs along with their comment counts, saving a request per PR.
        ghPaginate<{ number: number; comments: number }>(session.token, `/repos/${REPO}/issues?state=open`, 5),
    ]);
    const commentCounts = new Map(issues.map((i) => [i.number, i.comments]));

    const queue: QueuePr[] = await Promise.all(
        prs.map(async (pr) => ({
            number: pr.number,
            title: pr.title,
            author: pr.user?.login ?? "ghost",
            avatarUrl: pr.user?.avatar_url ?? "",
            authorAssociation: pr.author_association,
            createdAt: pr.created_at,
            draft: pr.draft,
            labels: (pr.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
            commentsCount: commentCounts.get(pr.number) ?? 0,
            checks: await summarizeChecks(session.token, pr.head.sha).catch(() => undefined),
        })),
    );
    return pass({ status: 200, data: queue });
});
