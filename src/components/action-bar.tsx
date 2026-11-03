"use client";

import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import MergeRounded from "@mui/icons-material/Merge";
import CloseRounded from "@mui/icons-material/CloseRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import QuickreplyRounded from "@mui/icons-material/QuickreplyRounded";
import EditNoteRounded from "@mui/icons-material/EditNoteRounded";
import PlayCircleFilledWhiteRounded from "@mui/icons-material/PlayCircleFilledWhiteRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import { api } from "@/lib/client";
import { CANNED_CHANGED_EVENT, DEFAULT_CANNED, loadCanned, saveCanned } from "@/lib/canned";
import { LabelsPicker } from "./labels-dialog";
import { CannedManager } from "./comments-tab";
import type { CannedResponse, ChecksPayload, PrDetail } from "@/lib/types";

type Notify = (message: string, severity?: "success" | "error" | "info") => void;

export default function ActionBar({
    pr,
    checks,
    onApproved,
    onMerged,
    onClosed,
    onSkipped,
    onLabelsChanged,
    onRefreshPr,
    onRefreshChecks,
    notify,
}: {
    pr: PrDetail;
    checks: ChecksPayload | null;
    onApproved: () => void;
    onMerged: () => void;
    onClosed: () => void;
    onSkipped?: () => void;
    onLabelsChanged: (names: string[]) => void;
    onRefreshPr?: () => void;
    onRefreshChecks?: () => void;
    notify: Notify;
}) {
    const [busy, setBusy] = useState<string | null>(null);
    const [approved, setApproved] = useState(false);
    const [mergeOpen, setMergeOpen] = useState(false);
    const [closeOpen, setCloseOpen] = useState(false);

    const refreshRef = useRef(onRefreshPr);
    refreshRef.current = onRefreshPr;
    useEffect(() => {
        if (pr.mergeable === null) {
            const id = setTimeout(() => refreshRef.current?.(), 2000);
            return () => clearTimeout(id);
        }
    }, [pr.mergeable]);

    const run = async (key: string, fn: () => Promise<void>) => {
        setBusy(key);
        try {
            await fn();
        } catch (e) {
            notify(e instanceof Error ? e.message : "Something went wrong", "error");
        } finally {
            setBusy(null);
        }
    };

    const approve = () =>
        run("approve", async () => {
            await api(`/api/pr/${pr.number}/review`, {
                method: "POST",
                body: JSON.stringify({ event: "APPROVE" }),
            });
            setApproved(true);
            notify(`Approved #${pr.number}`);
            onApproved();
        });

    const merge = () =>
        run("merge", async () => {
            if (!approved) {
                await api(`/api/pr/${pr.number}/review`, {
                    method: "POST",
                    body: JSON.stringify({ event: "APPROVE" }),
                });
                setApproved(true);
            }
            await api(`/api/pr/${pr.number}/merge`, {
                method: "POST",
                body: JSON.stringify({ method: "merge" }),
            });
            notify(`Merged #${pr.number}`);
            setMergeOpen(false);
            onMerged();
        });

    const updateBranch = () =>
        run("update-branch", async () => {
            await api(`/api/pr/${pr.number}/update-branch`, {
                method: "POST",
                body: JSON.stringify({ expectedHeadSha: pr.headSha }),
            });
            notify(`Updated branch for #${pr.number}`);
            setTimeout(() => {
                onRefreshPr?.();
                onRefreshChecks?.();
            }, 1500);
            setTimeout(() => {
                onRefreshPr?.();
                onRefreshChecks?.();
            }, 4500);
        });

    const failing =
        checks?.checkRuns.filter(
            (c) =>
                c.status === "completed" &&
                c.conclusion &&
                !["success", "neutral", "skipped"].includes(c.conclusion),
        ) ?? [];
    const pendingCheckRuns =
        checks?.checkRuns.filter((c) => c.status !== "completed") ?? [];
    const awaitingApproval =
        checks?.workflowRuns.filter(
            (r) =>
                r.status === "waiting" ||
                r.status === "action_required" ||
                r.conclusion === "action_required",
        ) ?? [];
    const pendingWorkflows =
        checks?.workflowRuns.filter(
            (r) =>
                r.status !== "completed" &&
                r.status !== "waiting" &&
                r.status !== "action_required",
        ) ?? [];
    const hasTestsPassed = !!checks?.checkRuns.some(
        (c) => c.name === "Tests" && c.status === "completed" && c.conclusion === "success",
    );
    const pendingCount = pendingCheckRuns.length + pendingWorkflows.length;

    const approveCi = () =>
        run("approve-ci", async () => {
            await Promise.all(
                awaitingApproval.map((r) =>
                    api(`/api/pr/${pr.number}/checks/action`, {
                        method: "POST",
                        body: JSON.stringify({ runId: r.id, action: "approve" }),
                    }),
                ),
            );
            notify(`Approved CI workflow${awaitingApproval.length > 1 ? "s" : ""} for #${pr.number}`);
            setTimeout(() => {
                onRefreshChecks?.();
                onRefreshPr?.();
            }, 1500);
            setTimeout(() => {
                onRefreshChecks?.();
                onRefreshPr?.();
            }, 4500);
        });

    // Reasons merging is blocked right now.
    const blockReasons: string[] = [];
    const warnings: string[] = [];
    if (!checks) {
        blockReasons.push("loading checks");
    } else {
        if (awaitingApproval.length > 0) {
            blockReasons.push(
                `${awaitingApproval.length} workflow${awaitingApproval.length > 1 ? "s" : ""} waiting for CI approval`,
            );
        }
        if (pendingCount > 0) {
            blockReasons.push("checks are still pending");
        }
        if (failing.length > 0) {
            blockReasons.push(`${failing.length} failing check${failing.length > 1 ? "s" : ""}`);
        }
        if (
            awaitingApproval.length === 0 &&
            pendingCount === 0 &&
            failing.length === 0 &&
            !hasTestsPassed
        ) {
            blockReasons.push("Tests check has not passed yet");
        }
    }
    if (pr.mergeable === false || pr.mergeableState === "dirty") {
        blockReasons.push("merge conflict");
    } else if (pr.mergeableState === "behind") {
        blockReasons.push("branch is behind base (update branch first)");
    } else if (pr.mergeableState === "blocked") {
        warnings.push("branch protection (auto-approves on merge)");
    } else if (pr.mergeableState === "unstable") {
        blockReasons.push("required checks are failing");
    }
    const mergeUnknown = pr.mergeable === null; // GitHub still computing
    const mergeBlocked = blockReasons.length > 0 || mergeUnknown;

    const summary = awaitingApproval.length > 0
        ? { color: "warning.main", text: "CI needs approval" }
        : pendingCount > 0 || !checks || mergeUnknown
          ? { color: "warning.main", text: "Checks running" }
          : failing.length > 0 || blockReasons.length > 0
            ? { color: "error.main", text: "Merge blocked" }
            : { color: "success.main", text: "Checks passing" };
    const showSummary = mergeBlocked || awaitingApproval.length > 0 || pendingCount > 0;

    const btnSx = {
        minHeight: 38,
        px: 1.5,
        whiteSpace: "nowrap",
        flexShrink: 0,
    } as const;

    return (
        <>
            <Paper
                elevation={0}
                sx={{
                    position: "sticky",
                    bottom: 12,
                    zIndex: 10,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.75,
                    alignItems: "center",
                    px: 1.5,
                    py: 1,
                    borderRadius: "20px",
                    bgcolor: "surfaceContainerHigh",
                    backdropFilter: "blur(12px)",
                }}
            >
                {showSummary && summary && (
                    <Tooltip
                        title={
                            awaitingApproval.length
                                ? `Waiting for approval: ${awaitingApproval.map((r) => r.name).join(", ")}`
                                : failing.length
                                  ? failing.map((c) => c.name).join(", ")
                                  : blockReasons.length
                                    ? `Can't merge: ${blockReasons.join(", ")}`
                                    : summary.text
                        }
                    >
                        <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: "center", pl: 0.5, mr: 0.5, flexShrink: 0 }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: summary.color,
                                    animation:
                                        summary.color === "warning.main"
                                            ? "pulse 1.6s ease-in-out infinite"
                                            : "none",
                                    "@keyframes pulse": { "50%": { opacity: 0.35 } },
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "text.secondary",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    display: { xs: "none", lg: "inline" },
                                }}
                            >
                                {summary.text}
                            </Typography>
                        </Stack>
                    </Tooltip>
                )}

                {/* Secondary utility actions */}
                <Tooltip
                    title={
                        pr.mergeableState === "behind"
                            ? `Branch is behind ${pr.baseRef} — click to update branch`
                            : `Update branch with latest ${pr.baseRef} changes`
                    }
                >
                    <span>
                        <IconButton
                            size="small"
                            color={pr.mergeableState === "behind" ? "warning" : "default"}
                            disabled={busy !== null}
                            onClick={updateBranch}
                            sx={{
                                width: 38,
                                height: 38,
                                bgcolor:
                                    pr.mergeableState === "behind"
                                        ? "warning.main"
                                        : "surfaceContainerHighest",
                                color:
                                    pr.mergeableState === "behind"
                                        ? "warning.contrastText"
                                        : "text.primary",
                                "&:hover": {
                                    bgcolor:
                                        pr.mergeableState === "behind"
                                            ? "warning.dark"
                                            : "action.selected",
                                },
                            }}
                        >
                            {busy === "update-branch" ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <SyncRounded fontSize="small" />
                            )}
                        </IconButton>
                    </span>
                </Tooltip>

                <Tooltip title="Skip to next PR">
                    <span>
                        <Button
                            variant="contained"
                            color="inherit"
                            size="small"
                            startIcon={<SkipNextRounded />}
                            disabled={busy !== null}
                            onClick={() => onSkipped?.()}
                            sx={btnSx}
                        >
                            Skip
                        </Button>
                    </span>
                </Tooltip>

                <Box sx={{ flex: 1, minWidth: 4 }} />

                {/* Primary review actions */}
                {awaitingApproval.length > 0 && (
                    <Tooltip
                        title={`Approve & run: ${awaitingApproval.map((r) => r.name).join(", ")}`}
                    >
                        <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            startIcon={
                                busy === "approve-ci" ? (
                                    <CircularProgress size={14} color="inherit" />
                                ) : (
                                    <PlayCircleFilledWhiteRounded />
                                )
                            }
                            disabled={busy !== null}
                            onClick={approveCi}
                            sx={btnSx}
                        >
                            Approve CI
                        </Button>
                    </Tooltip>
                )}
                <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<CloseRounded />}
                    disabled={busy !== null}
                    onClick={() => setCloseOpen(true)}
                    sx={btnSx}
                >
                    Close
                </Button>
                <Button
                    variant="contained"
                    color={approved ? "success" : "primary"}
                    size="small"
                    startIcon={<CheckRounded />}
                    disabled={busy !== null || approved}
                    onClick={approve}
                    sx={btnSx}
                >
                    {approved ? "Approved" : "Approve"}
                </Button>
                <Tooltip
                    title={
                        blockReasons.length > 0
                            ? `Can't merge: ${blockReasons.join(", ")}.`
                            : mergeUnknown
                              ? "Checking mergeability…"
                              : warnings.length
                                ? warnings.join(", ")
                                : ""
                    }
                    disableHoverListener={!mergeBlocked && !warnings.length}
                >
                    <span>
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<MergeRounded />}
                            disabled={busy !== null || mergeBlocked}
                            onClick={() => setMergeOpen(true)}
                            sx={btnSx}
                        >
                            Merge
                        </Button>
                    </span>
                </Tooltip>
            </Paper>

            {/* Merge confirmation */}
            <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Merge #{pr.number}?</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            This will {!approved && "approve and "}merge the PR via a merge commit and publish the DNS records.
                        </Typography>
                        {blockReasons.length > 0 && (
                            <Alert severity="error">
                                Can't merge: {blockReasons.join(", ")}.
                            </Alert>
                        )}
                        {mergeUnknown && (
                            <Alert severity="info">
                                Checking whether this PR can be merged. If this doesn't resolve,
                                refresh the PR.
                            </Alert>
                        )}
                        {awaitingApproval.length > 0 && (
                            <Alert severity="warning">
                                {awaitingApproval.length} workflow run
                                {awaitingApproval.length > 1 ? "s are" : " is"} waiting for approval.
                                Click &ldquo;Approve CI&rdquo; first.
                            </Alert>
                        )}
                        {pendingCount > 0 && (
                            <Alert severity="warning">
                                Checks are still running.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="text" onClick={() => setMergeOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={merge}
                        disabled={busy === "merge" || mergeBlocked}
                    >
                        {busy === "merge"
                            ? "Merging…"
                            : mergeBlocked
                              ? "Blocked"
                              : "Confirm merge"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Close dialog */}
            <CloseDialog
                open={closeOpen}
                onClose={() => setCloseOpen(false)}
                pr={pr}
                busy={busy === "close"}
                onConfirm={(selectedLabels, comment) =>
                    run("close", async () => {
                        const before = new Set((pr.labels || []).map((l) => l.name));
                        const toAdd = selectedLabels.filter((n) => !before.has(n));
                        const toRemove = [...before].filter((n) => !selectedLabels.includes(n));
                        if (toAdd.length > 0 || toRemove.length > 0) {
                            await api(`/api/pr/${pr.number}/labels`, {
                                method: "POST",
                                body: JSON.stringify({ add: toAdd, remove: toRemove }),
                            });
                            onLabelsChanged(selectedLabels);
                        }
                        await api(`/api/pr/${pr.number}/close`, {
                            method: "POST",
                            body: JSON.stringify({ comment: comment || undefined }),
                        });
                        notify(`Closed #${pr.number}`);
                        setCloseOpen(false);
                        onClosed();
                    })
                }
            />
        </>
    );
}

function CloseDialog({
    open,
    onClose,
    pr,
    busy,
    onConfirm,
}: {
    open: boolean;
    onClose: () => void;
    pr: PrDetail;
    busy: boolean;
    onConfirm: (selectedLabels: string[], comment: string) => void;
}) {
    const [canned, setCanned] = useState<CannedResponse[]>(DEFAULT_CANNED);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pickedOrder, setPickedOrder] = useState<string[]>([]);
    const [comment, setComment] = useState("");
    const [postComment, setPostComment] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [manageOpen, setManageOpen] = useState(false);

    useEffect(() => {
        const sync = () => setCanned(loadCanned());
        sync();
        window.addEventListener(CANNED_CHANGED_EVENT, sync);
        return () => window.removeEventListener(CANNED_CHANGED_EVENT, sync);
    }, []);

    // Reset when opened.
    const [lastOpen, setLastOpen] = useState(false);
    if (open !== lastOpen) {
        setLastOpen(open);
        if (open) {
            const initial = new Set(
                (pr.labels || [])
                    .map((l) => l.name)
                    .filter((n) => !n.startsWith("status:")),
            );
            initial.add("status: denied");
            setSelected(initial);
            setPickedOrder([]);
            setComment("");
            setPostComment(false);
        }
    }

    const toggleLabel = (name: string) => {
        const next = new Set(selected);
        const willBeActive = !next.has(name);
        if (willBeActive) next.add(name);
        else next.delete(name);
        setSelected(next);

        const nextOrder = willBeActive
            ? [...pickedOrder.filter((x) => x !== name), name]
            : pickedOrder.filter((x) => x !== name);
        setPickedOrder(nextOrder);

        // Build comment from toggled labels that have an associated canned response
        const bodies = nextOrder
            .map((labelName) => canned.find((c) => c.reasonLabel === labelName)?.body?.trim())
            .filter((b): b is string => Boolean(b));
        if (bodies.length > 0 || !willBeActive) {
            setComment(bodies.join("\n\n"));
        }
    };

    const insertCanned = (c: CannedResponse) => {
        setPostComment(true);
        setComment((prev) => (prev.trim() && c.body ? `${prev}\n\n${c.body}` : c.body || prev));
        if (c.reasonLabel) {
            setSelected((prev) => {
                const next = new Set(prev);
                next.add(c.reasonLabel!);
                return next;
            });
            setPickedOrder((prev) =>
                prev.includes(c.reasonLabel!) ? prev : [...prev, c.reasonLabel!],
            );
        }
        setMenuAnchor(null);
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Close #{pr.number}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <LabelsPicker
                            open={open}
                            selected={selected}
                            onToggle={toggleLabel}
                            autoFocus
                        />

                        <Box>
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: "center", flexWrap: "wrap", mb: 1 }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={postComment}
                                            onChange={(e) => setPostComment(e.target.checked)}
                                        />
                                    }
                                    label="Comment before closing"
                                    sx={{ mr: "auto" }}
                                />
                                <Button
                                    size="small"
                                    variant="tonal"
                                    startIcon={<QuickreplyRounded />}
                                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                                >
                                    Canned response
                                </Button>
                                <Tooltip title="Manage canned responses">
                                    <IconButton size="small" onClick={() => setManageOpen(true)}>
                                        <EditNoteRounded fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                            {postComment && (
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    label="Comment"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="text" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={busy}
                        onClick={() => onConfirm([...selected], postComment ? comment : "")}
                    >
                        {busy ? "Closing…" : "Close PR"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Canned picker menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                slotProps={{ paper: { sx: { maxHeight: 420, width: 340 } } }}
            >
                {canned.map((c) => (
                    <MenuItem key={c.id} onClick={() => insertCanned(c)}>
                        <ListItemText
                            primary={c.title}
                            secondary={c.reasonLabel || undefined}
                            slotProps={{ secondary: { variant: "caption" } }}
                        />
                    </MenuItem>
                ))}
            </Menu>

            {/* Manage dialog */}
            <CannedManager
                open={manageOpen}
                onClose={() => setManageOpen(false)}
                canned={canned}
                onChange={(list) => {
                    setCanned(list);
                    saveCanned(list);
                }}
            />
        </>
    );
}
