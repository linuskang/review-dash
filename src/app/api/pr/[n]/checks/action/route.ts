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
    const res = await gh(session.token, `/repos/${REPO}/actions/runs/${runId}${suffix}`, {
        method: "POST",
    });
    // These endpoints return 201 with an empty body on success.
    return pass({ ok: res.ok, status: res.status, data: res.data ?? { done: res.ok } });
});
