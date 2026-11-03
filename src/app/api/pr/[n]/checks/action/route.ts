import { isPositiveInt, withAuth, pass, readJson } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

const ACTIONS = {
    approve: "approve",
    rerun: "rerun",
    "rerun-failed": "rerun-failed-jobs",
} as const;

type Action = keyof typeof ACTIONS;

/**
 * Act on a workflow run. Body: { runId: number, action: "approve" | "rerun" | "rerun-failed" }
 * "approve" is the maintainer button for first-time-contributor runs.
 */
export const POST = withAuth(async (req, { session }) => {
    const { runId, action } = await readJson(req);
    if (!isPositiveInt(runId) || typeof action !== "string" || !Object.hasOwn(ACTIONS, action)) {
        return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const runPath = `/repos/${REPO}/actions/runs/${runId}`;

    let res = await gh(session.token, `${runPath}/${ACTIONS[action as Action]}`, { method: "POST" });
    // Fall back to /rerun if /approve is rejected (e.g. run already approved or a different gate).
    if (!res.ok && action === "approve") {
        const fallback = await gh(session.token, `${runPath}/rerun`, { method: "POST" });
        if (fallback.ok) res = fallback;
    }
    // These endpoints return 201 with an empty body on success.
    return pass({ status: res.status, data: res.data ?? { done: res.ok } });
});
