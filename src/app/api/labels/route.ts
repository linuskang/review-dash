import { withAuth, pass } from "@/lib/api";
import { ghPaginate, REPO } from "@/lib/github";

export const GET = withAuth(async (_req, { session }) => {
    const labels = await ghPaginate(session.token, `/repos/${REPO}/labels`, 2);
    const slim = (labels as { name: string; color: string; description: string | null }[]).map(
        (l) => ({ name: l.name, color: l.color, description: l.description }),
    );
    return pass({ ok: true, status: 200, data: slim });
});
