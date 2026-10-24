import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

/**
 * Combined view of CI for a PR:
 *  - check runs on the head commit (name, status, conclusion)
 *  - workflow runs for the head SHA — including ones in "waiting"/"action_required"
 *    that need a maintainer to approve them (first-time contributor button).
 */
export const GET = withAuth(async (_req, { session, params }) => {
    const pr = await gh(session.token, `/repos/${REPO}/pulls/${params.n}`);
    if (!pr.ok) return pass(pr);
    const headSha = (pr.data as { head: { sha: string } }).head.sha;

    const [checkRunsRes, runsRes] = await Promise.all([
        gh(session.token, `/repos/${REPO}/commits/${headSha}/check-runs?per_page=100`),
        gh(session.token, `/repos/${REPO}/actions/runs?head_sha=${headSha}&per_page=50`),
    ]);

    const checkRuns = checkRunsRes.ok
        ? (
              (checkRunsRes.data as { check_runs?: Record<string, unknown>[] }).check_runs || []
          ).map((c) => ({
              id: c.id,
              name: c.name,
              status: c.status, // queued | in_progress | completed
              conclusion: c.conclusion, // success | failure | neutral | skipped | ...
              htmlUrl: c.html_url,
              startedAt: c.started_at,
              completedAt: c.completed_at,
          }))
        : [];

    const workflowRuns = runsRes.ok
        ? ((runsRes.data as { workflow_runs?: Record<string, unknown>[] }).workflow_runs || []).map(
              (r) => ({
                  id: r.id,
                  name: r.name,
                  event: r.event,
                  status: r.status, // waiting | action_required | queued | in_progress | completed
                  conclusion: r.conclusion,
                  htmlUrl: r.html_url,
                  createdAt: r.created_at,
              }),
          )
        : [];

    return pass({ ok: true, status: 200, data: { headSha, checkRuns, workflowRuns } });
});
