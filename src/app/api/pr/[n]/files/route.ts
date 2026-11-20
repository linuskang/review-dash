import { withAuth, pass } from "@/lib/api";
import { gh, ghPaginate } from "@/lib/github";
import { extractOwnerFromText, extractOwnersFromPatch } from "@/lib/parse";

export const GET = withAuth(async (_req, { session, params, repo }) => {
    const files = await ghPaginate(session.token, `/repos/${repo}/pulls/${params.n}/files`, 3);
    const slim = (files as Record<string, unknown>[]).map((f) => ({
        filename: String(f.filename ?? ""),
        previousFilename: typeof f.previous_filename === "string" ? f.previous_filename : null,
        status: String(f.status ?? ""),
        additions: Number(f.additions ?? 0),
        deletions: Number(f.deletions ?? 0),
        patch: typeof f.patch === "string" ? f.patch : null,
        rawUrl: String(f.raw_url ?? ""),
        baseOwner: null as string | null,
    }));

    // If an existing domain JSON file was modified/removed/renamed and its diff hunk doesn't include
    // the "username" line (e.g. only DNS records further down were edited), look up the base file's owner.
    const needsBaseLookup = slim
        .filter(
            (f) =>
                f.status !== "added" &&
                f.filename.endsWith(".json") &&
                !extractOwnersFromPatch(f.patch).baseOwner,
        )
        .slice(0, 5);

    if (needsBaseLookup.length > 0) {
        await Promise.all(
            needsBaseLookup.map(async (f) => {
                const lookupPath = (f.previousFilename || f.filename)
                    .split("/")
                    .map(encodeURIComponent)
                    .join("/");
                const res = await gh<{ content?: string; encoding?: string }>(
                    session.token,
                    `/repos/${repo}/contents/${lookupPath}`,
                );
                if (res.ok && res.data?.content && res.data.encoding === "base64") {
                    const decoded = Buffer.from(res.data.content, "base64").toString("utf8");
                    f.baseOwner = extractOwnerFromText(decoded);
                }
            }),
        );
    }

    return pass({ ok: true, status: 200, data: slim });
});
