export interface PrLabel {
    name: string;
    color: string;
}

export interface QueuePr {
    number: number;
    title: string;
    author: string;
    avatarUrl: string;
    authorAssociation?: string;
    createdAt: string;
    draft: boolean;
    labels: PrLabel[];
    commentsCount?: number;
    checks?: { total: number; passed: number; failed: number; pending: number };
}

export interface PrDetail extends QueuePr {
    body: string | null;
    state: string;
    htmlUrl: string;
    headSha: string;
    headRef: string;
    baseRef: string;
    mergeable: boolean | null;
    mergeableState: string;
    merged: boolean;
    additions: number;
    deletions: number;
    changedFiles: number;
}

export interface PrFile {
    filename: string;
    status: string; // added | modified | removed | renamed
    additions: number;
    deletions: number;
    patch: string | null;
    rawUrl: string;
}

export interface PrComment {
    id: number;
    author: string;
    avatarUrl: string;
    isBot: boolean;
    body: string;
    createdAt: string;
    htmlUrl: string;
    association: string;
}

export interface CheckRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    htmlUrl: string;
    startedAt: string | null;
    completedAt: string | null;
}

export interface WorkflowRun {
    id: number;
    name: string;
    event: string;
    status: string;
    conclusion: string | null;
    htmlUrl: string;
    createdAt: string;
}

export interface ChecksPayload {
    headSha: string;
    checkRuns: CheckRun[];
    workflowRuns: WorkflowRun[];
}

export interface RepoLabel {
    name: string;
    color: string;
    description: string | null;
}

export interface CannedResponse {
    id: string;
    title: string;
    body: string;
    reasonLabel?: string; // matching reason:* label to suggest when closing
}
