import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

export const GET = withAuth(async (_req, { session, params }) => {
    const res = await gh(session.token, `/repos/${REPO}/pulls/${params.n}`);
    if (!res.ok) return pass(res);
    const pr = res.data as Record<string, never>;
    const user = pr.user as unknown as { login: string; avatar_url: string };
    const head = pr.head as unknown as { sha: string; ref: string };
    const base = pr.base as unknown as { ref: string };
    return pass({
        ok: true,
        status: 200,
        data: {
            number: pr.number,
            title: pr.title,
            body: pr.body,
            state: pr.state,
            draft: pr.draft,
            htmlUrl: pr.html_url,
            author: user?.login,
            avatarUrl: user?.avatar_url,
            authorAssociation: pr.author_association,
            createdAt: pr.created_at,
            labels: ((pr.labels as unknown as { name: string; color: string }[]) || []).map((l) => ({
                name: l.name,
                color: l.color,
            })),
            headSha: head?.sha,
            headRef: head?.ref,
            baseRef: base?.ref,
            mergeable: pr.mergeable,
            mergeableState: pr.mergeable_state,
            merged: pr.merged,
            additions: pr.additions,
            deletions: pr.deletions,
            changedFiles: pr.changed_files,
        },
    });
});
