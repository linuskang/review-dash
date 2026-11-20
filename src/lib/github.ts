/** Target repositories. Override is-a.dev with REPO_OWNER / REPO_NAME to review a fork. */
export const REPO_OWNER = process.env.REPO_OWNER || "is-a-dev";
export const REPO_NAME = process.env.REPO_NAME || "register";
export const REPO = `${encodeURIComponent(REPO_OWNER)}/${encodeURIComponent(REPO_NAME)}`;

export const BOT_REPO_OWNER = process.env.BOT_REPO_OWNER || "free-domains";
export const BOT_REPO_NAME = process.env.BOT_REPO_NAME || "is-a.bot";
export const BOT_REPO = `${encodeURIComponent(BOT_REPO_OWNER)}/${encodeURIComponent(BOT_REPO_NAME)}`;

export type RepoKey = "is-a.dev" | "is-a.bot";

export const REPOS: Record<RepoKey, string> = {
    "is-a.dev": REPO,
    "is-a.bot": BOT_REPO,
};

export function resolveRepo(req: Request): string {
    const raw =
        req.headers.get("x-target-repo") ?? new URL(req.url).searchParams.get("repo") ?? "is-a.dev";
    if (raw === "is-a.bot" || raw === "free-domains/is-a.bot") {
        return REPOS["is-a.bot"];
    }
    return REPOS["is-a.dev"];
}

const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 20_000;

export interface GhResult<T = unknown> {
    ok: boolean;
    status: number;
    data: T;
}

/** Call the GitHub REST API with the user's token. Never throws on HTTP errors; check `ok`. */
export async function gh<T = unknown>(token: string, path: string, init: RequestInit = {}): Promise<GhResult<T>> {
    const res = await fetch(`${GITHUB_API}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
        },
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
    });

    let data: unknown = null;
    const text = await res.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }
    return { ok: res.ok, status: res.status, data: data as T };
}

/** Paginate a GitHub list endpoint (up to `maxPages` pages of 100). */
export async function ghPaginate<T = unknown>(token: string, path: string, maxPages = 3): Promise<T[]> {
    const sep = path.includes("?") ? "&" : "?";
    const out: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const res = await gh<T[]>(token, `${path}${sep}per_page=100&page=${page}`);
        if (!res.ok || !Array.isArray(res.data)) break;
        out.push(...res.data);
        if (res.data.length < 100) break;
    }
    return out;
}

/** Check whether the user has maintainer-level (push) access to any target repo. */
export async function hasRepoAccess(token: string): Promise<boolean> {
    const checks = await Promise.all(
        Object.values(REPOS).map(async (repo) => {
            const res = await gh<{ permissions?: Record<string, boolean> }>(token, `/repos/${repo}`);
            if (!res.ok) return false;
            const perms = res.data.permissions;
            return Boolean(perms && (perms.admin || perms.maintain || perms.push));
        }),
    );
    return checks.some(Boolean);
}
