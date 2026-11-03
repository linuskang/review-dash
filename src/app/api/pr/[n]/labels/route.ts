import { HttpError, withAuth, pass, readJson } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

function stringList(value: unknown, field: string): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 100 || !value.every((v) => typeof v === "string" && v.length > 0)) {
        throw new HttpError(400, `invalid_${field}`);
    }
    return value as string[];
}

/** Add and/or remove labels. Body: { add?: string[], remove?: string[] }. Returns the current labels. */
export const POST = withAuth(async (req, { session, params }) => {
    const body = await readJson(req);
    const add = stringList(body.add, "add");
    const remove = stringList(body.remove, "remove");

    if (add.length) {
        const res = await gh(session.token, `/repos/${REPO}/issues/${params.n}/labels`, {
            method: "POST",
            body: JSON.stringify({ labels: add }),
        });
        if (!res.ok) return pass(res);
    }
    await Promise.all(
        remove.map((name) =>
            gh(session.token, `/repos/${REPO}/issues/${params.n}/labels/${encodeURIComponent(name)}`, {
                method: "DELETE",
            }),
        ),
    );

    const current = await gh<{ name: string; color: string }[]>(
        session.token,
        `/repos/${REPO}/issues/${params.n}/labels`,
    );
    if (!current.ok) return pass(current);
    const labels = current.data.map((l) => ({ name: l.name, color: l.color }));
    return pass({ status: 200, data: labels });
});
