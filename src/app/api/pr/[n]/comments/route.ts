import { withAuth, pass } from "@/lib/api";
import { gh, ghPaginate, REPO } from "@/lib/github";

export const GET = withAuth(async (_req, { session, params }) => {
    const comments = await ghPaginate(session.token, `/repos/${REPO}/issues/${params.n}/comments`, 2);
    const slim = (comments as Record<string, unknown>[]).map((c) => {
        const user = c.user as { login: string; avatar_url: string; type: string };
        return {
            id: c.id,
            author: user?.login,
            avatarUrl: user?.avatar_url,
            isBot: user?.type === "Bot",
            body: c.body,
            createdAt: c.created_at,
            htmlUrl: c.html_url,
            association: c.author_association,
        };
    });
    return pass({ ok: true, status: 200, data: slim });
});

export const POST = withAuth(async (req, { session, params }) => {
    const { body } = (await req.json()) as { body?: string };
    if (!body?.trim()) {
        return Response.json({ error: "body_required" }, { status: 400 });
    }
    const res = await gh(session.token, `/repos/${REPO}/issues/${params.n}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
    return pass(res);
});
