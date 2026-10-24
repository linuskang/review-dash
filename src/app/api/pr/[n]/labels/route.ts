import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

/** Add and/or remove labels. Body: { add?: string[], remove?: string[] }. Returns the current labels. */
export const POST = withAuth(async (req, { session, params }) => {
    const { add = [], remove = [] } = (await req.json()) as { add?: string[]; remove?: string[] };

    if (add.length) {
        const res = await gh(session.token, `/repos/${REPO}/issues/${params.n}/labels`, {
            method: "POST",
            body: JSON.stringify({ labels: add }),
        });
        if (!res.ok) return pass(res);
    }
    for (const name of remove) {
        await gh(session.token, `/repos/${REPO}/issues/${params.n}/labels/${encodeURIComponent(name)}`, {
            method: "DELETE",
        });
    }

    const current = await gh(session.token, `/repos/${REPO}/issues/${params.n}/labels`);
    if (!current.ok) return pass(current);
    const labels = (current.data as { name: string; color: string }[]).map((l) => ({
        name: l.name,
        color: l.color,
    }));
    return pass({ ok: true, status: 200, data: labels });
});
