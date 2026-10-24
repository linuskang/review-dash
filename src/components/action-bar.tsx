"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Checkbox,
    Chip,
    ClickAwayListener,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    MenuList,
    Paper,
    Popper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowDropDownRounded from "@mui/icons-material/ArrowDropDownRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import MergeRounded from "@mui/icons-material/Merge";
import CloseRounded from "@mui/icons-material/CloseRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import { api } from "@/lib/client";
import { loadCanned } from "@/lib/canned";
import type { ChecksPayload, PrDetail } from "@/lib/types";

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
    notify: Notify;
}) {
    const [busy, setBusy] = useState<string | null>(null);
    const [approved, setApproved] = useState(false);
    const [mergeOpen, setMergeOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [method, setMethod] = useState<"merge" | "rebase">("merge");
    const [closeOpen, setCloseOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);
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
                body: JSON.stringify({ method }),
            });
            notify(`Merged #${pr.number}`);
            setMergeOpen(false);
            onMerged();
        });

    const failing =
        checks?.checkRuns.filter(
            (c) =>
                c.status === "completed" &&
                c.conclusion &&
                !["success", "neutral", "skipped"].includes(c.conclusion),
        ) ?? [];
    const pending = checks?.checkRuns.filter((c) => c.status !== "completed") ?? [];
    const awaitingApproval =
        checks?.workflowRuns.filter((r) => r.status === "waiting" || r.status === "action_required") ??
        [];

    // Reasons merging is blocked right now.
    const blockReasons: string[] = [];
    if (failing.length > 0) blockReasons.push(`${failing.length} failing check${failing.length > 1 ? "s" : ""}`);
    if (pr.mergeable === false) blockReasons.push("merge conflict");
    else if (pr.mergeableState === "dirty") blockReasons.push("merge conflict");
    else if (pr.mergeableState === "blocked") blockReasons.push("branch protection blocks it");
    else if (pr.mergeableState === "unstable") blockReasons.push("required checks are failing");
    const mergeBlocked = blockReasons.length > 0;
    const mergeUnknown = pr.mergeable === null; // GitHub still computing

    const summary = mergeBlocked
        ? { color: "error.main", text: "Merge blocked" }
        : !checks
          ? null
          : failing.length > 0
            ? { color: "error.main", text: `${failing.length} check${failing.length > 1 ? "s" : ""} failing` }
            : awaitingApproval.length > 0
              ? { color: "warning.main", text: "CI needs approval" }
              : pending.length > 0
                ? { color: "warning.main", text: "Checks running" }
                : { color: "success.main", text: "Checks passing" };
    const showSummary = mergeBlocked || awaitingApproval.length > 0;

    return (
        <>
            <Paper
                elevation={0}
                sx={{
                    position: "sticky",
                    bottom: 12,
                    zIndex: 10,
                    display: "flex",
                    gap: 1,
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
                            failing.length
                                ? failing.map((c) => c.name).join(", ")
                                : summary.text
                        }
                    >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", pl: 0.5 }}>
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
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                {summary.text}
                            </Typography>
                        </Stack>
                    </Tooltip>
                )}
                <Box sx={{ flex: 1 }} />
                <Button
                    variant="text"
                    size="small"
                    startIcon={<SkipNextRounded />}
                    disabled={busy !== null}
                    onClick={() => onSkipped?.()}
                >
                    Skip
                </Button>
                <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<CloseRounded />}
                    disabled={busy !== null}
                    onClick={() => setCloseOpen(true)}
                >
                    Close
                </Button>
                <Button
                    variant={approved ? "tonal" : "outlined"}
                    size="small"
                    startIcon={<CheckRounded />}
                    disabled={busy !== null || approved}
                    onClick={approve}
                    sx={
                        approved
                            ? { bgcolor: "successContainer", color: "onSuccessContainer" }
                            : undefined
                    }
                >
                    {approved ? "Approved" : "Approve"}
                </Button>
                <Tooltip
                    title={
                        mergeBlocked
                            ? `Can't merge: ${blockReasons.join(", ")}.`
                            : mergeUnknown
                              ? "Checking mergeability…"
                              : ""
                    }
                    disableHoverListener={!mergeBlocked && !mergeUnknown}
                >
                    <span>
                        <ButtonGroup variant="contained" size="small" ref={anchorRef}>
                            <Button
                                startIcon={<MergeRounded />}
                                disabled={busy !== null || mergeBlocked}
                                onClick={() => setMergeOpen(true)}
                                sx={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                            >
                                {approved ? "Merge" : "Approve & merge"}
                            </Button>
                            <Button
                                disabled={busy !== null || mergeBlocked}
                                onClick={() => setMenuOpen((o) => !o)}
                                sx={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, px: 0.5 }}
                                aria-label="Choose merge method"
                            >
                                <ArrowDropDownRounded />
                            </Button>
                        </ButtonGroup>
                    </span>
                </Tooltip>
                <Popper open={menuOpen} anchorEl={anchorRef.current} placement="top-end" sx={{ zIndex: 20 }}>
                    <ClickAwayListener onClickAway={() => setMenuOpen(false)}>
                        <Paper sx={{ borderRadius: "16px", bgcolor: "surfaceContainer", mt: -1 }}>
                            <MenuList dense>
                                <MenuItem
                                    selected={method === "merge"}
                                    onClick={() => {
                                        setMethod("merge");
                                        setMenuOpen(false);
                                    }}
                                >
                                    Merge commit
                                </MenuItem>
                                <MenuItem
                                    selected={method === "rebase"}
                                    onClick={() => {
                                        setMethod("rebase");
                                        setMenuOpen(false);
                                    }}
                                >
                                    Rebase and merge
                                </MenuItem>
                            </MenuList>
                        </Paper>
                    </ClickAwayListener>
                </Popper>
            </Paper>

            {/* Merge confirmation */}
            <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Merge #{pr.number}?</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            Method: <b>{method === "merge" ? "merge commit" : "rebase"}</b>. This will{" "}
                            {!approved && "approve and "}merge the PR and publish the DNS records.
                        </Typography>
                        {mergeBlocked && (
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
                                Approve them from the Checks tab first if required.
                            </Alert>
                        )}
                        {pending.length > 0 && (
                            <Alert severity="warning">
                                {pending.length} check{pending.length > 1 ? "s" : ""} still running.
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
                            ? "Merging�?�"
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
                onConfirm={(reasonLabels, comment) =>
                    run("close", async () => {
                        if (reasonLabels.length) {
                            await api(`/api/pr/${pr.number}/labels`, {
                                method: "POST",
                                body: JSON.stringify({ add: reasonLabels }),
                            });
                            onLabelsChanged(reasonLabels);
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
    onConfirm: (reasonLabels: string[], comment: string) => void;
}) {
    const reasons = useMemo(() => loadCanned().filter((c) => c.reasonLabel), [open]);
    const [picked, setPicked] = useState<string | null>(null);
    const [comment, setComment] = useState("");
    const [postComment, setPostComment] = useState(true);

    // Reset when opened.
    const [lastOpen, setLastOpen] = useState(false);
    if (open !== lastOpen) {
        setLastOpen(open);
        if (open) {
            setPicked(null);
            setComment("");
            setPostComment(true);
        }
    }

    const pick = (id: string | null) => {
        setPicked(id);
        const c = reasons.find((r) => r.id === id);
        if (c) setComment(c.body);
    };

    const labels = picked ? [reasons.find((r) => r.id === picked)!.reasonLabel!] : [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Close #{pr.number}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 0.5 }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700 }}>
                            Reason (adds label)
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
                            {reasons.map((r) => (
                                <Chip
                                    key={r.id}
                                    label={r.title}
                                    onClick={() => pick(picked === r.id ? null : r.id)}
                                    sx={{
                                        fontWeight: 600,
                                        border: "1.5px solid",
                                        borderColor: picked === r.id ? "#D93F0B" : "outlineVariant",
                                        bgcolor: picked === r.id ? "#D93F0B26" : "transparent",
                                        color: picked === r.id ? "#D93F0B" : "text.secondary",
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={postComment}
                                onChange={(e) => setPostComment(e.target.checked)}
                            />
                        }
                        label="Comment before closing"
                    />
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
                    onClick={() => onConfirm(labels, postComment ? comment : "")}
                >
                    {busy ? "Closing…" : "Close PR"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
