import type { CannedResponse } from "./types";

export const DEFAULT_CANNED: CannedResponse[] = [
    {
        id: "incomplete-website",
        title: "Incomplete website",
        reasonLabel: "reason: incomplete website",
        body: "Your website appears to be incomplete or has very little content. We don't register domains for placeholder sites. Please finish your website first, then open a new PR (or update this one) once it's ready.",
    },
    {
        id: "inaccessible",
        title: "Inaccessible website",
        reasonLabel: "reason: inaccessible website",
        body: "I can't reach your website at the preview link you provided (it errors, times out, or is private). Please make sure the site is publicly accessible and the link is correct, and I'll review it again.",
    },
    {
        id: "not-dev",
        title: "Not dev related",
        reasonLabel: "reason: not dev related",
        body: "Root subdomains are typically only for developer portfolios. If you want to place this website on a domain, use a **nested subdoman**.",
    },
    {
        id: "commercial",
        title: "Commercial usage",
        reasonLabel: "reason: commercial usage",
        body: "is-a.dev domains cannot be used for commercial purposes per our [Terms of Service](https://is-a.dev/terms).",
    },
    {
        id: "invalid-records",
        title: "Invalid records",
        reasonLabel: "reason: invalid records",
        body: "The DNS records in your file are invalid or improper. Please double-check them against the [documentation](https://docs.is-a.dev). Note that some record types can't be combined (e.g. CNAME with other records).",
    },
    {
        id: "invalid-file",
        title: "Invalid file",
        reasonLabel: "reason: invalid file",
        body: "Your file is invalid. Please make sure it's valid JSON, located in the `domains/` directory, named correctly (lowercase, matching the [domain structure](https://docs.is-a.dev/domain-structure/)), and includes a valid `owner` key with contact info.",
    },
    {
        id: "merge-conflict",
        title: "Merge conflict",
        reasonLabel: "reason: merge conflict",
        body: "Your PR has a merge conflict. Please update your branch with the latest changes and resolve the conflict.",
    },
    {
        id: "unauthorized",
        title: "Unauthorized domain change",
        reasonLabel: "reason: unauthorized",
        body: "You are not the registered owner of this domain, so you can't modify it. If you believe this is a mistake, please open an issue instead with proof of ownership.",
    },
    {
        id: "impersonation",
        title: "Impersonation",
        reasonLabel: "reason: impersonation",
        body: "This website appears to impersonate another person, project, or service. That violates our [Terms of Service](https://is-a.dev/terms).",
    },
    {
        id: "abuse-risk",
        title: "Abuse risk",
        reasonLabel: "reason: abuse risk",
        body: "This request has a high risk of being abused, so we can't approve it.",
    },
    {
        id: "tos-non-compliant",
        title: "TOS non-compliant",
        reasonLabel: "reason: tos non-compliant",
        body: "Your request doesn't comply with our [Terms of Service](https://is-a.dev/terms).",
    },
    {
        id: "nsfw",
        title: "NSFW content",
        reasonLabel: "reason: nsfw",
        body: "Your website hosts NSFW content, which is not permitted under our [Terms of Service](https://is-a.dev/terms).",
    },
    {
        id: "ns-records",
        title: "NS records need reasoning",
        body: "Your PR requests NS records, which require review by the service owner. Please add your **reasoning for needing NS records** to the PR description. Requests without justification will be denied.",
    }
];

const KEY = "isd_canned";
export const CANNED_CHANGED_EVENT = "isd_canned_changed";

export function loadCanned(): CannedResponse[] {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as CannedResponse[];
    } catch {
        /* ignore */
    }
    return DEFAULT_CANNED;
}

export function saveCanned(list: CannedResponse[]) {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(CANNED_CHANGED_EVENT));
}

export function resetCanned() {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(CANNED_CHANGED_EVENT));
}
