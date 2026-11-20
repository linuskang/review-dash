// Pure helpers for parsing the is-a.dev PR template. Shared by client and server.

export interface Requirement {
    key: string | null; // HTML comment marker, e.g. "TOS"
    label: string; // human-readable text, markdown stripped
    checked: boolean;
}

export interface ParsedPrBody {
    requirements: Requirement[];
    previewUrl: string | null;
    purpose: string | null;
}

function stripMarkdown(text: string): string {
    return text
        .replace(/<!--[\s\S]*?-->/g, "") // html comments
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
        .replace(/\*\*([^*]*)\*\*/g, "$1") // bold
        .replace(/`([^`]*)`/g, "$1") // inline code
        .replace(/\s+/g, " ")
        .trim();
}

function section(body: string, marker: string): string | null {
    const re = new RegExp(
        `<!--\\s*${marker}_START\\s*-->([\\s\\S]*?)<!--\\s*${marker}_END\\s*-->`,
        "i",
    );
    const match = body.match(re);
    if (!match) return null;
    const text = match[1].replace(/<!--[\s\S]*?-->/g, "").trim();
    return text.length ? text : null;
}

/**
 * Extract the first absolute http(s) URL from untrusted text. Anything else (javascript:, data:,
 * relative paths, …) is rejected because the result is rendered in an iframe and as a link.
 */
export function safeHttpUrl(text: string | null | undefined): string | null {
    const trimmed = text?.trim() ?? "";
    let candidate = trimmed.match(/https?:\/\/[^\s)<>"'`]+/i)?.[0];
    // Allow a bare hostname such as "name.is-a.dev" and assume https.
    if (!candidate && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s<>"'`]*)?$/i.test(trimmed)) {
        candidate = `https://${trimmed}`;
    }
    if (!candidate) return null;
    try {
        const url = new URL(candidate);
        if (url.protocol !== "https:" && url.protocol !== "http:") return null;
        if (url.username || url.password) return null;
        return url.href;
    } catch {
        return null;
    }
}

export function parsePrBody(body: string | null | undefined): ParsedPrBody {
    if (!body) return { requirements: [], previewUrl: null, purpose: null };

    const requirements: Requirement[] = [];
    const checkboxRe = /^- \[( |x|X)\]\s*(?:<!--\s*([A-Z_]+)\s*-->)?\s*(.+)$/gm;
    let match: RegExpExecArray | null;
    while ((match = checkboxRe.exec(body)) !== null) {
        requirements.push({
            key: match[2] ?? null,
            label: stripMarkdown(match[3]),
            checked: match[1].toLowerCase() === "x",
        });
    }

    return {
        requirements,
        previewUrl: safeHttpUrl(section(body, "WEBSITE_PREVIEW")),
        purpose: section(body, "WEBSITE_PURPOSE"),
    };
}

export interface OwnerMismatch {
    filename: string;
    status: string;
    baseOwner: string | null;
    headOwner: string | null;
    reason: string;
}

export interface OwnerCheckResult {
    ok: boolean | null;
    bypassed: boolean;
    mismatches: OwnerMismatch[];
    verifiedOwners: string[];
}

export function hasOwnerBypassLabel(labels: { name: string }[] | null | undefined): boolean {
    if (!labels) return false;
    return labels.some((l) => /bypass.*owner/i.test(l.name));
}

export function extractOwnerFromText(text: string | null | undefined): string | null {
    if (!text) return null;
    try {
        const parsed = JSON.parse(text) as { owner?: { username?: unknown } };
        if (typeof parsed?.owner?.username === "string" && parsed.owner.username.trim()) {
            return parsed.owner.username.trim();
        }
    } catch {
        // Diff hunk may be partial JSON; fall through to regex extraction.
    }

    const ownerBlock = text.match(/"owner"\s*:\s*\{[^}]*?"username"\s*:\s*"([^"]+)"/i);
    if (ownerBlock?.[1]?.trim()) return ownerBlock[1].trim();

    const usernameLine = text.match(/"username"\s*:\s*"([^"]+)"/i);
    if (usernameLine?.[1]?.trim()) return usernameLine[1].trim();

    return null;
}

export function extractOwnersFromPatch(patch: string | null | undefined): {
    baseOwner: string | null;
    headOwner: string | null;
} {
    if (!patch) return { baseOwner: null, headOwner: null };
    const baseLines: string[] = [];
    const headLines: string[] = [];
    const removedLines: string[] = [];
    const addedLines: string[] = [];

    for (const line of patch.split("\n")) {
        if (line.startsWith("@@") || line.startsWith("\\")) continue;
        if (line.startsWith("-") && !line.startsWith("---")) {
            const content = line.slice(1);
            baseLines.push(content);
            removedLines.push(content);
        } else if (line.startsWith("+") && !line.startsWith("+++")) {
            const content = line.slice(1);
            headLines.push(content);
            addedLines.push(content);
        } else if (line.startsWith(" ")) {
            const content = line.slice(1);
            baseLines.push(content);
            headLines.push(content);
        }
    }

    const baseOwner =
        extractOwnerFromText(baseLines.join("\n")) ??
        extractOwnerFromText(removedLines.join("\n"));
    const headOwner =
        extractOwnerFromText(headLines.join("\n")) ??
        extractOwnerFromText(addedLines.join("\n"));

    return { baseOwner, headOwner };
}

export function checkPrOwner(
    prAuthor: string,
    files: {
        filename: string;
        status: string;
        patch: string | null;
        baseOwner?: string | null;
    }[] | null,
    labels: { name: string }[] | null | undefined,
): OwnerCheckResult {
    const bypassed = hasOwnerBypassLabel(labels);
    if (!files) {
        return { ok: bypassed ? true : null, bypassed, mismatches: [], verifiedOwners: [] };
    }

    const domainFiles = files.filter(
        (f) => /^domains\/.*\.json$/i.test(f.filename) || f.filename.endsWith(".json"),
    );
    if (domainFiles.length === 0) {
        return { ok: bypassed ? true : null, bypassed, mismatches: [], verifiedOwners: [] };
    }

    const authorLower = prAuthor.toLowerCase();
    const mismatches: OwnerMismatch[] = [];
    const verifiedOwners: string[] = [];

    for (const f of domainFiles) {
        const fromPatch = extractOwnersFromPatch(f.patch);
        const baseOwner =
            f.status === "added" ? null : (fromPatch.baseOwner ?? f.baseOwner ?? null);
        const headOwner =
            f.status === "removed"
                ? null
                : (fromPatch.headOwner ?? (f.status !== "added" ? baseOwner : null));

        if (f.status !== "added") {
            if (baseOwner && baseOwner.toLowerCase() !== authorLower) {
                const changedTo =
                    headOwner && headOwner.toLowerCase() !== baseOwner.toLowerCase()
                        ? ` (changed to @${headOwner})`
                        : "";
                mismatches.push({
                    filename: f.filename,
                    status: f.status,
                    baseOwner,
                    headOwner,
                    reason: `${f.filename} belongs to @${baseOwner}${changedTo}, not @${prAuthor}`,
                });
            } else if (headOwner && headOwner.toLowerCase() !== authorLower) {
                mismatches.push({
                    filename: f.filename,
                    status: f.status,
                    baseOwner,
                    headOwner,
                    reason: `${f.filename} sets owner to @${headOwner} instead of @${prAuthor}`,
                });
            } else if (!baseOwner && !headOwner) {
                mismatches.push({
                    filename: f.filename,
                    status: f.status,
                    baseOwner: null,
                    headOwner: null,
                    reason: `Could not verify owner in diff for ${f.filename}`,
                });
            } else {
                const owner = baseOwner ?? headOwner;
                if (owner && !verifiedOwners.includes(owner)) verifiedOwners.push(owner);
            }
        } else {
            if (headOwner && headOwner.toLowerCase() !== authorLower) {
                mismatches.push({
                    filename: f.filename,
                    status: f.status,
                    baseOwner: null,
                    headOwner,
                    reason: `${f.filename} sets owner to @${headOwner} instead of @${prAuthor}`,
                });
            } else if (!headOwner) {
                mismatches.push({
                    filename: f.filename,
                    status: f.status,
                    baseOwner: null,
                    headOwner: null,
                    reason: `Missing owner.username in diff for ${f.filename}`,
                });
            } else if (!verifiedOwners.includes(headOwner)) {
                verifiedOwners.push(headOwner);
            }
        }
    }

    return {
        ok: bypassed ? true : mismatches.length === 0,
        bypassed,
        mismatches,
        verifiedOwners,
    };
}
