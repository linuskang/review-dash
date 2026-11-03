import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";
import type { PrDetail } from "@/lib/types";

interface GhPullDetail {
    number: number;
    title: string;
    body: string | null;
    state: string;
    draft: boolean;
    html_url: string;
    user: { login: string; avatar_url: string } | null;
    author_association: string;
    created_at: string;
    labels: { name: string; color: string }[];
    head: { sha: string; ref: string };
    base: { ref: string };
    mergeable: boolean | null;
    mergeable_state: string;
    merged: boolean;
    additions: number;
    deletions: number;
    changed_files: number;
}

export const GET = withAuth(async (_req, { session, params }) => {
    const res = await gh<GhPullDetail>(session.token, `/repos/${REPO}/pulls/${params.n}`);
    if (!res.ok) return pass(res);
    const pr = res.data;
    const detail: PrDetail = {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        draft: pr.draft,
        htmlUrl: pr.html_url,
        author: pr.user?.login ?? "ghost",
        avatarUrl: pr.user?.avatar_url ?? "",
        authorAssociation: pr.author_association,
        createdAt: pr.created_at,
        labels: (pr.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
        headSha: pr.head.sha,
        headRef: pr.head.ref,
        baseRef: pr.base.ref,
        mergeable: pr.mergeable,
        mergeableState: pr.mergeable_state,
        merged: pr.merged,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
    };
    return pass({ status: 200, data: detail });
});
