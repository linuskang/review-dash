"use client";

export type RepoKey = "is-a.dev" | "is-a.bot";

let activeRepo: RepoKey = "is-a.dev";

export function getActiveRepo(): RepoKey {
    return activeRepo;
}

export function setActiveRepo(repo: RepoKey): void {
    activeRepo = repo;
}

export async function api<T = unknown>(
    path: string,
    init?: RequestInit & { repo?: RepoKey },
): Promise<T> {
    const targetRepo = init?.repo ?? activeRepo;
    const headers = new Headers(init?.headers);
    headers.set("X-Target-Repo", targetRepo);
    if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const res = await fetch(path, {
        ...init,
        headers,
    });
    if (res.status === 401) {
        window.location.href = "/login?error=expired";
        throw new Error("unauthorized");
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const message =
            (data && (data.message as string)) || (data && (data.error as string)) || `HTTP ${res.status}`;
        throw new Error(message);
    }
    return data as T;
}

export function timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    const units: [number, string][] = [
        [31536000, "y"],
        [2592000, "mo"],
        [86400, "d"],
        [3600, "h"],
        [60, "m"],
    ];
    for (const [secs, suffix] of units) {
        if (seconds >= secs) return `${Math.floor(seconds / secs)}${suffix} ago`;
    }
    return "just now";
}

/** Readable text color (black/white) for a hex background, per WCAG luminance. */
export function contrastFor(hex: string): string {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.45 ? "#1D1B20" : "#FFFFFF";
}
