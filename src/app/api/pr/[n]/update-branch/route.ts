import { withAuth, pass, readJson } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

/** Update a PR's branch with the latest changes from the base branch. Body: { expectedHeadSha?: string } */
export const POST = withAuth(async (req, { session, params }) => {
    const { expectedHeadSha } = await readJson(req);
    if (expectedHeadSha !== undefined && (typeof expectedHeadSha !== "string" || !/^[0-9a-f]{40}$/i.test(expectedHeadSha))) {
        return Response.json({ error: "invalid_expected_head_sha" }, { status: 400 });
    }
    const res = await gh(session.token, `/repos/${REPO}/pulls/${params.n}/update-branch`, {
        method: "PUT",
        body: JSON.stringify(expectedHeadSha ? { expected_head_sha: expectedHeadSha } : {}),
    });
    return pass(res);
});
