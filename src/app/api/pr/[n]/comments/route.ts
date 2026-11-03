import { withAuth, pass, readJson } from "@/lib/api";
import { gh, ghPaginate, REPO } from "@/lib/github";

interface GhComment {
    id: number;
    user: { login: string; avatar_url: string; type: string } | null;
    body: string;
    created_at: string;
    html_url: string;
    author_association: string;
}

export const GET = withAuth(async (_req, { session, params }) => {
    const comments = await ghPaginate<GhComment>(session.token, `/repos/${REPO}/issues/${params.n}/comments`, 2);
    const slim = comments.map((c) => ({
        id: c.id,
        author: c.user?.login,
        avatarUrl: c.user?.avatar_url,
        isBot: c.user?.type === "Bot",
        body: c.body,
        createdAt: c.created_at,
        htmlUrl: c.html_url,
        association: c.author_association,
    }));
    return pass({ status: 200, data: slim });
});

export const POST = withAuth(async (req, { session, params }) => {
    const { body } = await readJson(req);
    if (typeof body !== "string" || !body.trim()) {
        return Response.json({ error: "body_required" }, { status: 400 });
    }
    const res = await gh(session.token, `/repos/${REPO}/issues/${params.n}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
    return pass(res);
});
