import { withAuth, pass } from "@/lib/api";
import { ghPaginate, REPO } from "@/lib/github";

export const GET = withAuth(async (_req, { session, params }) => {
    const files = await ghPaginate(session.token, `/repos/${REPO}/pulls/${params.n}/files`, 3);
    const slim = (files as Record<string, unknown>[]).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch ?? null,
        rawUrl: f.raw_url,
    }));
    return pass({ ok: true, status: 200, data: slim });
});
