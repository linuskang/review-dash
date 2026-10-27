import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

/**
 * Act on a workflow run. Body: { runId: number, action: "approve" | "rerun" | "rerun-failed" }
 * "approve" is the maintainer button for first-time-contributor runs.
 */
export const POST = withAuth(async (req, { session }) => {
    const { runId, action } = (await req.json()) as { runId?: number; action?: string };
    if (!runId || !action || !["approve", "rerun", "rerun-failed"].includes(action)) {
        return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const suffix = action === "rerun-failed" ? "/rerun-failed-jobs" : `/${action}`;
    let res = await gh(session.token, `/repos/${REPO}/actions/runs/${runId}${suffix}`, {
        method: "POST",
    });
    // Fallback to /rerun if /approve is rejected (e.g. run already approved or different gate).
    if (!res.ok && action === "approve") {
        const fallback = await gh(session.token, `/repos/${REPO}/actions/runs/${runId}/rerun`, {
            method: "POST",
        });
        if (fallback.ok) res = fallback;
    }
    // These endpoints return 201 with an empty body on success.
    return pass({ ok: res.ok, status: res.status, data: res.data ?? { done: res.ok } });
});
