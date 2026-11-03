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
