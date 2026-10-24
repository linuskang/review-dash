import { withAuth, pass } from "@/lib/api";
import { gh, REPO } from "@/lib/github";

export const GET = withAuth(async (_req, { session, params }) => {
    const res = await gh(session.token, `/repos/${REPO}/issues/${params.n}/events?per_page=100`);
    if (!res.ok) return pass(res);
    const raw = (res.data as Record<string, unknown>[]) || [];
    const events = raw.map((e) => ({
        id: e.id,
        event: e.event,
        actor: (e.actor as { login?: string } | null)?.login ?? "unknown",
        avatarUrl: (e.actor as { avatar_url?: string } | null)?.avatar_url ?? "",
        label: (e.label as { name?: string } | null)?.name ?? null,
        createdAt: e.created_at,
    }));
    return pass({ ok: true, status: 200, data: events });
});