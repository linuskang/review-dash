import { withAuth, pass, readJson } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

const METHODS = ["merge", "rebase"];

/** Merge a PR. Body: { method?: "merge" | "rebase" } (squash is disabled on the upstream repo). */
export const POST = withAuth(async (req, { session, params }) => {
    const { method = "merge" } = await readJson(req);
    if (typeof method !== "string" || !METHODS.includes(method)) {
        return Response.json({ error: "invalid_method" }, { status: 400 });
    }
    const res = await gh(session.token, `/repos/${REPO}/pulls/${params.n}/merge`, {
        method: "PUT",
        body: JSON.stringify({ merge_method: method }),
    });
    return pass(res);
});
