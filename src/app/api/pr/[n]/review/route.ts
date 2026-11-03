import { withAuth, pass, readJson } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

const EVENTS = ["APPROVE", "REQUEST_CHANGES", "COMMENT"];

/** Submit a PR review. Body: { event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", body?: string } */
export const POST = withAuth(async (req, { session, params }) => {
    const { event, body } = await readJson(req);
    if (typeof event !== "string" || !EVENTS.includes(event)) {
        return Response.json({ error: "invalid_event" }, { status: 400 });
    }
    const text = typeof body === "string" ? body.trim() : "";
    const res = await gh(session.token, `/repos/${REPO}/pulls/${params.n}/reviews`, {
        method: "POST",
        body: JSON.stringify({ event, ...(text ? { body } : {}) }),
    });
    return pass(res);
});
