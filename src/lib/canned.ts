import type { CannedResponse } from "./types";

export const DEFAULT_CANNED: CannedResponse[] = [
    {
        id: "lgtm",
        title: "LGTM, merging",
        body: "Looks good, thanks for the PR! Merging now. Your domain should be live within a few minutes once the DNS records publish. 🎉",
    },
    {
        id: "incomplete-pr",
        title: "Incomplete PR template",
        reasonLabel: "reason: incomplete pr",
        body: "Your PR template is incomplete. Please fill out **all** requirement checkboxes (exactly `[x]`), and provide both the **Website Preview** link and **Website Purpose** between the markers. Your PR cannot be approved until the template is properly completed.",
    },
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
        body: "I can't reach your website at the preview link you provided (it errors, times out, or is private). Please make sure the site is publicly accessible and the link is correct, then let us know.",
    },
    {
        id: "not-dev",
        title: "Not dev related",
        reasonLabel: "reason: not dev related",
        body: "is-a.dev subdomains are only for **software development** related websites (portfolios, projects, dev tools, etc.). Your website doesn't appear to meet this requirement, so we can't register this domain. Closing this PR.",
    },
    {
        id: "commercial",
        title: "Commercial usage",
        reasonLabel: "reason: commercial usage",
        body: "is-a.dev domains cannot be used for commercial purposes per our [Terms of Service](https://is-a.dev/terms). Your website appears to be for a business / revenue-generating purpose, so we can't approve this. Closing this PR.",
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
        body: "Your PR has a merge conflict with `main`. Please update your fork/branch with the latest changes and resolve the conflict, then this PR can be re-reviewed.",
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
        body: "This website appears to impersonate another person, project, or service. That violates our [Terms of Service](https://is-a.dev/terms). Closing this PR.",
    },
    {
        id: "abuse-risk",
        title: "Abuse risk",
        reasonLabel: "reason: abuse risk",
        body: "This request has a high risk of being abused (e.g. phishing-like subdomain or content), so we can't approve it. Closing this PR.",
    },
    {
        id: "tos-non-compliant",
        title: "TOS non-compliant",
        reasonLabel: "reason: tos non-compliant",
        body: "Your request doesn't comply with our [Terms of Service](https://is-a.dev/terms), so we can't approve this. Closing this PR.",
    },
    {
        id: "nsfw",
        title: "NSFW content",
        reasonLabel: "reason: nsfw",
        body: "Your website hosts NSFW content, which is not permitted under our [Terms of Service](https://is-a.dev/terms). Closing this PR.",
    },
    {
        id: "needs-preview",
        title: "Needs preview link",
        body: "Please provide a **link** (not a screenshot) to your currently-live website in the Website Preview section of the PR template (e.g. `https://you.github.io` or `https://you.vercel.app`), between the start/end markers.",
    },
    {
        id: "ns-records",
        title: "NS records need reasoning",
        body: "Your PR requests NS records, which require review by the service owner. Please add your **reasoning for needing NS records** to the PR description. Requests without justification can't be approved.",
    },
    {
        id: "awaiting-response",
        title: "Awaiting user response",
        body: "Please address the points above and reply here once done and I'll take another look. 👍",
    },
    {
        id: "other",
        title: "Other",
        reasonLabel: "reason: other",
        body: "",
    },
];

const KEY = "isd_canned";

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
}

export function resetCanned() {
    window.localStorage.removeItem(KEY);
}
