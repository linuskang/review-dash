import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

/** Update a PR's branch with the latest changes from the base branch. */
export const POST = withAuth(async (req, { session, params }) => {
    const { expectedHeadSha } = (await req.json().catch(() => ({}))) as {
        expectedHeadSha?: string;
    };
    const res = await gh(session.token, `/repos/${REPO}/pulls/${params.n}/update-branch`, {
        method: "PUT",
        body: JSON.stringify(
            expectedHeadSha ? { expected_head_sha: expectedHeadSha } : {},
        ),
    });
    return pass(res);
});
