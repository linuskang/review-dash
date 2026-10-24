import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

const MAX_LOG_CHARS = 12000;

/** Keep the lines that matter: errors, failures, and the tail as context. */
function extractRelevantLines(raw: string): string {
    const lines = raw
        .replace(/\x1b\[[0-9;]*m/g, "") // ANSI colors
        .split("\n")
        .map((l) => l.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/, "").replace(/\s+$/, ""));

    const interesting = lines.filter((l) =>
        /(::error|::warning|\berror\b|\bfail|✖|✗|✘|exception|rejected|expected)/i.test(l),
    );

    const picked = interesting.length >= 3 ? interesting : [...interesting, ...lines.slice(-30)];
    // De-dupe while preserving order, then cap.
    const seen = new Set<string>();
    const out = picked.filter((l) => l.trim() && !seen.has(l) && seen.add(l));
    const text = out.join("\n");
    return text.length > MAX_LOG_CHARS ? `…\n${text.slice(-MAX_LOG_CHARS)}` : text;
}

/** GET ?runId= → logs for the failed jobs of that workflow run. */
export const GET = withAuth(async (req, { session }) => {
    const runId = new URL(req.url).searchParams.get("runId");
    if (!runId) return Response.json({ error: "runId_required" }, { status: 400 });

    const jobsRes = await gh(
        session.token,
        `/repos/${REPO}/actions/runs/${runId}/jobs?filter=latest&per_page=100`,
    );
    if (!jobsRes.ok) return pass(jobsRes);

    const jobs = (jobsRes.data as { jobs?: Record<string, unknown>[] }).jobs || [];
    const failed = jobs.filter((j) => j.conclusion === "failure");

    const results = await Promise.all(
        failed.map(async (job) => {
            const logsRes = await gh<string>(session.token, `/repos/${REPO}/actions/jobs/${job.id}/logs`);
            return {
                name: job.name as string,
                htmlUrl: job.html_url as string,
                logs:
                    logsRes.ok && typeof logsRes.data === "string"
                        ? extractRelevantLines(logsRes.data)
                        : `Could not load logs (HTTP ${logsRes.status}).`,
            };
        }),
    );

    return pass({ ok: true, status: 200, data: results });
});
