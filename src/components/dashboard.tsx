"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Link,
    Menu,
    MenuItem,
    Paper,
    Snackbar,
    Alert,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MergeRounded from "@mui/icons-material/Merge";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import PrQueue from "./pr-queue";
import ReviewPanel from "./review-panel";
import PreviewColumn from "./preview-column";
import Wordmark from "./wordmark";
import { useColorMode } from "./theme-registry";
import { api, setActiveRepo, type RepoKey } from "@/lib/client";
import type { PrDetail, QueuePr } from "@/lib/types";

interface Me {
    login: string;
    name: string | null;
    avatarUrl: string;
}

interface ActionQueueItem {
    id: string;
    repo: RepoKey;
    number: number;
    title: string;
    htmlUrl: string;
    action: "merge" | "close";
    status: "queued" | "running" | "succeeded" | "failed";
    error?: string;
}

const REPO_TABS: { key: RepoKey; label: string; slug: string }[] = [
    { key: "is-a.dev", label: "is-a.dev", slug: "is-a-dev/register" },
    { key: "is-a.bot", label: "is-a.bot", slug: "free-domains/is-a.bot" },
];

export default function Dashboard() {
    const { mode, toggle } = useColorMode();
    const [repo, setRepo] = useState<RepoKey>("is-a.dev");
    const repoRef = useRef<RepoKey>("is-a.dev");
    const [me, setMe] = useState<Me | null>(null);
    const [prs, setPrs] = useState<QueuePr[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [prDetail, setPrDetail] = useState<PrDetail | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [toast, setToast] = useState<{ message: string; severity: "success" | "error" | "info" } | null>(
        null,
    );
    const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
    const inFlightSetRef = useRef<Set<string>>(new Set());
    const actionChainRef = useRef<Promise<void>>(Promise.resolve());
    const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        const timers = dismissTimersRef.current;
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    const dismissQueueItem = useCallback((itemId: string) => {
        const timer = dismissTimersRef.current.get(itemId);
        if (timer) {
            clearTimeout(timer);
            dismissTimersRef.current.delete(itemId);
        }
        setActionQueue((prev) => prev.filter((item) => item.id !== itemId));
    }, []);

    const notify = useCallback(
        (message: string, severity: "success" | "error" | "info" = "success") =>
            setToast({ message, severity }),
        [],
    );

    const updateQueuePr = useCallback((n: number, patch: Partial<QueuePr>) => {
        setPrs((queue) => queue.map((p) => (p.number === n ? { ...p, ...patch } : p)));
    }, []);

    const loadQueue = useCallback(
        async (targetRepo: RepoKey = repoRef.current, silent = false) => {
            if (!silent) setLoading(true);
            try {
                const list = await api<QueuePr[]>("/api/prs", { repo: targetRepo });
                if (repoRef.current !== targetRepo) return;
                const visible = list.filter(
                    (p) => !inFlightSetRef.current.has(`${targetRepo}:${p.number}`),
                );
                setPrs(visible);
                setSelected((sel) => {
                    if (sel && visible.some((p) => p.number === sel)) return sel;
                    return visible.length ? visible[0].number : null; // oldest open PR
                });
            } catch (e) {
                if (repoRef.current === targetRepo) {
                    notify(e instanceof Error ? e.message : "Failed to load queue", "error");
                }
            } finally {
                if (!silent && repoRef.current === targetRepo) setLoading(false);
            }
        },
        [notify],
    );

    const loadPrDetail = useCallback(
        async (n: number, targetRepo: RepoKey = repoRef.current) => {
            try {
                const detail = await api<PrDetail>(`/api/pr/${n}`, { repo: targetRepo });
                if (repoRef.current !== targetRepo) return;
                setPrDetail(detail);
                updateQueuePr(n, {
                    labels: detail.labels,
                    title: detail.title,
                    draft: detail.draft,
                    author: detail.author,
                    avatarUrl: detail.avatarUrl,
                    authorAssociation: detail.authorAssociation,
                });
            } catch {
                if (repoRef.current === targetRepo) setPrDetail(null);
            }
        },
        [updateQueuePr],
    );

    const handleQueuePatch = useCallback(
        (n: number, patch: Partial<QueuePr>) => {
            if (patch.labels) {
                setPrDetail((prev) =>
                    prev && prev.number === n ? { ...prev, labels: patch.labels! } : prev,
                );
            }
            updateQueuePr(n, patch);
        },
        [updateQueuePr],
    );

    const handleSwitchRepo = useCallback(
        (nextRepo: RepoKey) => {
            if (nextRepo === repoRef.current) return;
            repoRef.current = nextRepo;
            setActiveRepo(nextRepo);
            setRepo(nextRepo);
            window.localStorage.setItem("isd_repo", nextRepo);
            setPrs([]);
            setSelected(null);
            setPrDetail(null);
            loadQueue(nextRepo);
        },
        [loadQueue],
    );

    useEffect(() => {
        if (selected) loadPrDetail(selected, repo);
        else setPrDetail(null);
    }, [selected, repo, loadPrDetail]);

    useEffect(() => {
        const stored = window.localStorage.getItem("isd_repo");
        const initialRepo: RepoKey = stored === "is-a.bot" ? "is-a.bot" : "is-a.dev";
        repoRef.current = initialRepo;
        setActiveRepo(initialRepo);
        setRepo(initialRepo);
        api<Me>("/api/me").then(setMe).catch(() => {});
        loadQueue(initialRepo);
    }, [loadQueue]);

    /** Enqueue a background PR action (merge or close) and advance immediately without waiting for GitHub. */
    const enqueuePrAction = useCallback(
        (
            pr: PrDetail,
            action: "merge" | "close",
            task: (targetRepo: RepoKey) => Promise<void>,
        ) => {
            const targetRepo = repoRef.current;
            const itemId = `${targetRepo}:${pr.number}`;
            if (inFlightSetRef.current.has(itemId)) return;
            inFlightSetRef.current.add(itemId);

            const snapshot: QueuePr = prs.find((p) => p.number === pr.number) ?? {
                number: pr.number,
                title: pr.title,
                author: pr.author,
                avatarUrl: pr.avatarUrl,
                authorAssociation: pr.authorAssociation,
                createdAt: pr.createdAt,
                draft: pr.draft,
                labels: pr.labels,
                commentsCount: pr.commentsCount,
                checks: pr.checks,
            };

            // Advance immediately so the user does not wait for the GitHub API.
            const idx = prs.findIndex((p) => p.number === pr.number);
            const next = prs.filter((p) => p.number !== pr.number);
            const target = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
            setPrs((prev) => prev.filter((p) => p.number !== pr.number));
            setSelected((curSel) => (curSel === pr.number ? (target ? target.number : null) : curSel));

            const existingTimer = dismissTimersRef.current.get(itemId);
            if (existingTimer) {
                clearTimeout(existingTimer);
                dismissTimersRef.current.delete(itemId);
            }

            setActionQueue((prev) => [
                ...prev.filter((item) => item.id !== itemId),
                {
                    id: itemId,
                    repo: targetRepo,
                    number: pr.number,
                    title: pr.title,
                    htmlUrl: pr.htmlUrl,
                    action,
                    status: "queued",
                },
            ]);

            actionChainRef.current = actionChainRef.current.then(async () => {
                setActionQueue((prev) =>
                    prev.map((item) =>
                        item.id === itemId
                            ? { ...item, status: "running", error: undefined }
                            : item,
                    ),
                );
                try {
                    await task(targetRepo);
                    inFlightSetRef.current.delete(itemId);
                    setActionQueue((prev) =>
                        prev.map((item) =>
                            item.id === itemId ? { ...item, status: "succeeded" } : item,
                        ),
                    );
                    const timer = setTimeout(() => {
                        dismissTimersRef.current.delete(itemId);
                        setActionQueue((prev) =>
                            prev.filter(
                                (item) =>
                                    !(item.id === itemId && item.status === "succeeded"),
                            ),
                        );
                    }, 5000);
                    dismissTimersRef.current.set(itemId, timer);
                } catch (e) {
                    inFlightSetRef.current.delete(itemId);
                    const errorMessage =
                        e instanceof Error
                            ? e.message
                            : action === "merge"
                              ? "Failed to merge"
                              : "Failed to close";
                    setActionQueue((prev) =>
                        prev.map((item) =>
                            item.id === itemId
                                ? { ...item, status: "failed", error: errorMessage }
                                : item,
                        ),
                    );
                    if (repoRef.current === targetRepo) {
                        setPrs((prev) => {
                            if (prev.some((p) => p.number === pr.number)) return prev;
                            return [...prev, snapshot].sort((a, b) => a.number - b.number);
                        });
                        setSelected((curSel) => (curSel === null ? pr.number : curSel));
                    }
                }
            });
        },
        [prs],
    );

    const handleMergePr = useCallback(
        (pr: PrDetail, alreadyApproved: boolean) => {
            enqueuePrAction(pr, "merge", async (targetRepo) => {
                if (!alreadyApproved) {
                    await api(`/api/pr/${pr.number}/review`, {
                        method: "POST",
                        body: JSON.stringify({ event: "APPROVE" }),
                        repo: targetRepo,
                    });
                }
                await api(`/api/pr/${pr.number}/merge`, {
                    method: "POST",
                    body: JSON.stringify({ method: "merge" }),
                    repo: targetRepo,
                });
            });
        },
        [enqueuePrAction],
    );

    const handleClosePr = useCallback(
        (pr: PrDetail, selectedLabels: string[], comment: string) => {
            enqueuePrAction(pr, "close", async (targetRepo) => {
                const before = new Set((pr.labels || []).map((l) => l.name));
                const toAdd = selectedLabels.filter((n) => !before.has(n));
                const toRemove = [...before].filter((n) => !selectedLabels.includes(n));
                if (toAdd.length > 0 || toRemove.length > 0) {
                    await api(`/api/pr/${pr.number}/labels`, {
                        method: "POST",
                        body: JSON.stringify({ add: toAdd, remove: toRemove }),
                        repo: targetRepo,
                    });
                }
                await api(`/api/pr/${pr.number}/close`, {
                    method: "POST",
                    body: JSON.stringify({ comment: comment || undefined }),
                    repo: targetRepo,
                });
            });
        },
        [enqueuePrAction],
    );

    const handleSkip = useCallback(() => {
        if (prs.length <= 1) return;
        const idx = prs.findIndex((p) => p.number === selected);
        setSelected(prs[(idx + 1) % prs.length].number);
    }, [prs, selected]);

    const activeItems = actionQueue.filter(
        (item) => item.status === "queued" || item.status === "running",
    );
    const activeCount = activeItems.length;
    const failedCount = actionQueue.filter((item) => item.status === "failed").length;
    const hasMerge = actionQueue.some((item) => item.action === "merge");
    const hasClose = actionQueue.some((item) => item.action === "close");
    const queueHeading =
        hasMerge && !hasClose ? "Merge queue" : hasClose && !hasMerge ? "Close queue" : "PR queue";
    const activeLabel =
        hasMerge && !hasClose
            ? `${activeCount} merging`
            : hasClose && !hasMerge
              ? `${activeCount} closing`
              : `${activeCount} active`;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", p: 1, gap: 1 }}>
            {/* Top bar */}
            <Stack
                direction="row"
                spacing={2}
                sx={{
                    alignItems: "center",
                    px: 1,
                }}
            >
                <Wordmark height={34} />
                <Stack
                    direction="row"
                    spacing={0.5}
                    role="tablist"
                    aria-label="Repository switcher"
                    sx={{
                        bgcolor: "surfaceContainerHigh",
                        borderRadius: "999px",
                        p: 0.5,
                        border: "1px solid",
                        borderColor: "outlineVariant",
                    }}
                >
                    {REPO_TABS.map((t) => {
                        const active = repo === t.key;
                        return (
                            <Tooltip key={t.key} title={t.slug}>
                                <Button
                                    role="tab"
                                    aria-selected={active}
                                    size="small"
                                    onClick={() => handleSwitchRepo(t.key)}
                                    sx={{
                                        minHeight: 32,
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: "999px",
                                        fontWeight: 700,
                                        fontSize: 13,
                                        bgcolor: active ? "primary.main" : "transparent",
                                        color: active ? "primary.contrastText" : "text.secondary",
                                        boxShadow: active ? 2 : 0,
                                        "&:hover": {
                                            bgcolor: active
                                                ? "primary.main"
                                                : "surfaceContainerHighest",
                                            color: active ? "primary.contrastText" : "text.primary",
                                        },
                                    }}
                                >
                                    {t.label}
                                </Button>
                            </Tooltip>
                        );
                    })}
                </Stack>
                <Box sx={{ flex: 1 }} />
                <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
                    <IconButton onClick={toggle}>
                        {mode === "dark" ? <LightModeRounded /> : <DarkModeRounded />}
                    </IconButton>
                </Tooltip>
                {me && (
                    <>
                        <Tooltip title={me.login}>
                            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.25 }}>
                                <Avatar src={me.avatarUrl} sx={{ width: 38, height: 38 }} />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={() => setMenuAnchor(null)}
                        >
                            <form method="post" action="/api/auth/logout">
                                <MenuItem component="button" type="submit" sx={{ width: "100%" }}>
                                    <LogoutRounded fontSize="small" style={{ marginRight: 10 }} />
                                    Sign out
                                </MenuItem>
                            </form>
                        </Menu>
                    </>
                )}
            </Stack>

            {/* Body */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
                <PrQueue
                    prs={prs}
                    selected={selected}
                    onSelect={setSelected}
                    loading={loading}
                    onRefresh={() => loadQueue(repo)}
                />
                <Box sx={{ flex: "2 1 0", minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    {selected === null ? (
                        <Stack
                            spacing={1}
                            sx={{
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                bgcolor: "surfaceContainerLow",
                                borderRadius: "28px",
                                textAlign: "center",
                                p: 4
                            }}>
                            <Typography variant="h5">
                                {loading ? "Loading…" : "Nothing left to review"}
                            </Typography>
                        </Stack>
                    ) : (
                        <ReviewPanel
                            key={`${repo}:${selected}`}
                            prNumber={selected}
                            pr={prDetail && prDetail.number === selected ? prDetail : null}
                            onRefreshPr={() => selected && loadPrDetail(selected, repo)}
                            onSyncQueue={(patch) => selected && handleQueuePatch(selected, patch)}
                            onMerge={handleMergePr}
                            onClosePr={handleClosePr}
                            onSkip={handleSkip}
                            notify={notify}
                        />
                    )}
                </Box>
                {selected !== null && (
                    <Box sx={{ display: { xs: "none", md: "flex" }, flex: "2.5 1 0", minWidth: 0 }}>
                        <PreviewColumn pr={prDetail && prDetail.number === selected ? prDetail : null} />
                    </Box>
                )}
            </Stack>

            {/* Top-right background merge/close queue notifications */}
            <Box
                sx={{
                    position: "fixed",
                    top: 16,
                    right: 16,
                    zIndex: 1400,
                    width: 340,
                    maxWidth: "calc(100vw - 32px)",
                    pointerEvents: "none",
                }}
            >
                <AnimatePresence>
                    {actionQueue.length > 0 && (
                        <motion.div
                            key="action-queue-panel"
                            initial={{ opacity: 0, y: -12, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -12, scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                            style={{ pointerEvents: "auto" }}
                        >
                            <Paper
                                elevation={6}
                                sx={{
                                    p: 1.5,
                                    borderRadius: "20px",
                                    bgcolor: "surfaceContainerHigh",
                                    border: "1px solid",
                                    borderColor: "outlineVariant",
                                    backdropFilter: "blur(12px)",
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ alignItems: "center", px: 0.5, mb: 1 }}
                                >
                                    {activeCount > 0 ? (
                                        <CircularProgress size={15} thickness={5} />
                                    ) : (
                                        <MergeRounded sx={{ fontSize: 18, color: "text.secondary" }} />
                                    )}
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ flex: 1, fontWeight: 700, lineHeight: 1.2 }}
                                    >
                                        {queueHeading}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={
                                            activeCount > 0
                                                ? activeLabel
                                                : failedCount > 0
                                                  ? `${failedCount} failed`
                                                  : "Done"
                                        }
                                        sx={{
                                            height: 20,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            bgcolor:
                                                failedCount > 0
                                                    ? "errorContainer"
                                                    : activeCount > 0
                                                      ? "secondaryContainer"
                                                      : "successContainer",
                                            color:
                                                failedCount > 0
                                                    ? "onErrorContainer"
                                                    : activeCount > 0
                                                      ? "onSecondaryContainer"
                                                      : "onSuccessContainer",
                                        }}
                                    />
                                </Stack>

                                <Stack spacing={0.75} sx={{ maxHeight: 320, overflowY: "auto" }}>
                                    <AnimatePresence initial={false}>
                                        {actionQueue.map((item) => {
                                            const isFailed = item.status === "failed";
                                            const isSucceeded = item.status === "succeeded";
                                            const isRunning = item.status === "running";
                                            const isMerge = item.action === "merge";
                                            const repoPrefix =
                                                item.repo !== repo ? `${item.repo} ` : "";
                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 420,
                                                        damping: 34,
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={1.25}
                                                        sx={{
                                                            alignItems: "center",
                                                            px: 1.25,
                                                            py: 1,
                                                            borderRadius: "14px",
                                                            bgcolor: isFailed
                                                                ? "errorContainer"
                                                                : isSucceeded
                                                                  ? "successContainer"
                                                                  : "surfaceContainerHighest",
                                                            color: isFailed
                                                                ? "onErrorContainer"
                                                                : isSucceeded
                                                                  ? "onSuccessContainer"
                                                                  : "text.primary",
                                                        }}
                                                    >
                                                        {isFailed ? (
                                                            <CancelRounded
                                                                sx={{
                                                                    fontSize: 18,
                                                                    color: "error.main",
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        ) : isSucceeded ? (
                                                            <CheckCircleRounded
                                                                sx={{
                                                                    fontSize: 18,
                                                                    color: "success.main",
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        ) : (
                                                            <CircularProgress
                                                                size={16}
                                                                thickness={5}
                                                                color="inherit"
                                                                sx={{ flexShrink: 0 }}
                                                            />
                                                        )}

                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    lineHeight: 1.25,
                                                                }}
                                                            >
                                                                {isFailed ? (
                                                                    <>
                                                                        Failed to{" "}
                                                                        {isMerge ? "merge" : "close"}{" "}
                                                                        {repoPrefix}
                                                                        <Link
                                                                            href={item.htmlUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            underline="always"
                                                                            sx={{
                                                                                fontWeight: 800,
                                                                                color: "inherit",
                                                                            }}
                                                                        >
                                                                            #{item.number}
                                                                        </Link>
                                                                    </>
                                                                ) : isSucceeded ? (
                                                                    <>
                                                                        {isMerge ? "Merged" : "Closed"}{" "}
                                                                        {repoPrefix}#{item.number}
                                                                    </>
                                                                ) : isRunning ? (
                                                                    <>
                                                                        {isMerge
                                                                            ? "Merging"
                                                                            : "Closing"}{" "}
                                                                        {repoPrefix}#{item.number}…
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Queued{" "}
                                                                        {isMerge ? "merge" : "close"}{" "}
                                                                        {repoPrefix}#{item.number}
                                                                    </>
                                                                )}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                noWrap
                                                                title={
                                                                    isFailed && item.error
                                                                        ? item.error
                                                                        : item.title
                                                                }
                                                                sx={{
                                                                    display: "block",
                                                                    opacity: 0.85,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                }}
                                                            >
                                                                {isFailed && item.error
                                                                    ? item.error
                                                                    : item.title}
                                                            </Typography>
                                                        </Box>

                                                        {(isFailed || isSucceeded) && (
                                                            <Tooltip title="Dismiss">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        dismissQueueItem(item.id)
                                                                    }
                                                                    sx={{
                                                                        color: "inherit",
                                                                        p: 0.4,
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    <CloseRounded sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </Stack>
                            </Paper>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                {toast ? (
                    <Alert
                        variant="filled"
                        severity={toast.severity}
                        onClose={() => setToast(null)}
                        sx={{ borderRadius: "14px" }}
                    >
                        {toast.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Box>
    );
}
