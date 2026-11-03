import { withAuth, pass, readJson } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

/** Close a PR. Optionally posts a comment first. Body: { comment?: string } */
export const POST = withAuth(async (req, { session, params }) => {
    const { comment } = await readJson(req);

    if (typeof comment === "string" && comment.trim()) {
        const res = await gh(session.token, `/repos/${REPO}/issues/${params.n}/comments`, {
            method: "POST",
            body: JSON.stringify({ body: comment }),
        });
        if (!res.ok) return pass(res);
    }

    const res = await gh(session.token, `/repos/${REPO}/pulls/${params.n}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed" }),
    });
    return pass(res);
});
