export const REPO_OWNER = process.env.REPO_OWNER || "is-a-dev";
export const REPO_NAME = process.env.REPO_NAME || "register";
export const REPO = `${REPO_OWNER}/${REPO_NAME}`;

export interface GhResult<T = unknown> {
    ok: boolean;
    status: number;
    data: T;
}

export async function gh<T = unknown>(
    token: string,
    path: string,
    init: RequestInit = {},
): Promise<GhResult<T>> {
    const res = await fetch(`https://api.github.com${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
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
export async function ghPaginate<T = unknown>(
    token: string,
    path: string,
    maxPages = 3,
): Promise<T[]> {
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

/** Check whether the user has maintainer-level (push) access to the register repo. */
export async function hasRepoAccess(token: string): Promise<boolean> {
    const res = await gh(token, `/repos/${REPO}`);
    if (!res.ok) return false;
    const perms = (res.data as { permissions?: Record<string, boolean> }).permissions;
    return Boolean(perms && (perms.admin || perms.maintain || perms.push));
}
