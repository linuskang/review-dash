import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

/** Submit a PR review. Body: { event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", body?: string } */
export const POST = withAuth(async (req, { session, params }) => {
    const { event, body } = (await req.json()) as { event?: string; body?: string };
    if (!event || !["APPROVE", "REQUEST_CHANGES", "COMMENT"].includes(event)) {
        return Response.json({ error: "invalid_event" }, { status: 400 });
    }
    const res = await gh(session.token, `/repos/${REPO}/pulls/${params.n}/reviews`, {
        method: "POST",
        body: JSON.stringify({ event, ...(body?.trim() ? { body } : {}) }),
    });
    return pass(res);
});
