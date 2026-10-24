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

    const previewRaw = section(body, "WEBSITE_PREVIEW");
    const urlMatch = previewRaw?.match(/https?:\/\/[^\s)<>]+/);

    return {
        requirements,
        previewUrl: urlMatch ? urlMatch[0] : previewRaw,
        purpose: section(body, "WEBSITE_PURPOSE"),
    };
}
