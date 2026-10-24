"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Avatar,
    Box,
    Chip,
    IconButton,
    Link,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from "@mui/material";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import LocalOfferRounded from "@mui/icons-material/LocalOfferRounded";
import { api, timeAgo } from "@/lib/client";
import LabelChip from "./label-chip";
import LabelsDialog from "./labels-dialog";
import OverviewTab from "./overview-tab";
import FilesTab from "./files-tab";
import ChecksTab from "./checks-tab";
import CommentsTab from "./comments-tab";
import ActionBar from "./action-bar";
import type {
    ChecksPayload,
    PrComment,
    PrDetail,
    PrFile,
    PrLabel,
} from "@/lib/types";

type Notify = (message: string, severity?: "success" | "error" | "info") => void;

export default function ReviewPanel({
    prNumber,
    pr,
    onRefreshPr,
    onAdvanced,
    onSkip,
    notify,
}: {
    prNumber: number;
    pr: PrDetail | null;
    onRefreshPr: () => void;
    onAdvanced: (action: "merged" | "closed") => void;
    onSkip?: () => void;
    notify: Notify;
}) {
    const [files, setFiles] = useState<PrFile[] | null>(null);
    const [comments, setComments] = useState<PrComment[] | null>(null);
    const [checks, setChecks] = useState<ChecksPayload | null>(null);
    const [tab, setTab] = useState(0);
    const [labelsOpen, setLabelsOpen] = useState(false);
    const refreshRef = useRef(onRefreshPr);
    refreshRef.current = onRefreshPr;

    const loadFiles = useCallback(() => {
        api<PrFile[]>(`/api/pr/${prNumber}/files`).then(setFiles).catch(() => setFiles([]));
    }, [prNumber]);

    const loadComments = useCallback(() => {
        api<PrComment[]>(`/api/pr/${prNumber}/comments`).then(setComments).catch(() => setComments([]));
    }, [prNumber]);

    const loadChecks = useCallback(() => {
        api<ChecksPayload>(`/api/pr/${prNumber}/checks`).then(setChecks).catch(() => {});
    }, [prNumber]);

    useEffect(() => {
        setFiles(null);
        setComments(null);
        setChecks(null);
        setTab(0);
        loadFiles();
        loadComments();
        loadChecks();
    }, [prNumber, loadFiles, loadComments, loadChecks]);

    // Poll CI while anything is running or waiting.
    useEffect(() => {
        if (!checks) return;
        const active =
            checks.checkRuns.some((c) => c.status !== "completed") ||
            checks.workflowRuns.some((r) => r.status !== "completed");
        if (!active) return;
        const id = setInterval(loadChecks, 12_000);
        return () => clearInterval(id);
    }, [checks, loadChecks]);

    // Refresh PR detail when checks finish so mergeability updates.
    useEffect(() => {
        if (!checks) return;
        if (checks.checkRuns.some((c) => c.status !== "completed")) return;
        if (
            checks.workflowRuns.some(
                (r) => r.status !== "completed" && r.status !== "waiting" && r.status !== "action_required",
            )
        )
            return;
        refreshRef.current();
    }, [checks]);

    // Resolve mergeability if GitHub is still computing.
    useEffect(() => {
        if (!pr || pr.mergeable !== null) return;
        const id = setTimeout(() => refreshRef.current(), 2000);
        return () => clearTimeout(id);
    }, [pr]);

    const onLabelsSaved = (labels: PrLabel[]) => {
        onRefreshPr();
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={prNumber}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                style={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
                {!pr ? (
                    <Stack spacing={2} sx={{ p: 1 }}>
                        <Skeleton variant="rounded" height={130} sx={{ borderRadius: "28px" }} />
                        <Skeleton variant="rounded" height={320} sx={{ borderRadius: "28px" }} />
                    </Stack>
                ) : (
                    <>
                        {/* Header */}
                        <Box
                            sx={{
                                bgcolor: "surfaceContainerLow",
                                borderRadius: "28px",
                                p: 2.5,
                                mb: 2,
                            }}
                        >
                            <Stack direction="row" spacing={2} sx={{
                                alignItems: "flex-start"
                            }}>
                                <Avatar src={pr.avatarUrl} sx={{ width: 44, height: 44 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} sx={{
                                        alignItems: "center"
                                    }}>
                                        <Typography
                                            variant="h5"
                                            noWrap
                                            title={pr.title}
                                            sx={{ flex: 1, minWidth: 0 }}
                                        >
                                            {pr.title}
                                        </Typography>
                                        <Tooltip title="Open on GitHub">
                                            <IconButton href={pr.htmlUrl} target="_blank" size="small">
                                                <OpenInNewRounded fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Refresh">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    onRefreshPr();
                                                    loadChecks();
                                                }}
                                            >
                                                <RefreshRounded fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Typography
                                        variant="body2"
                                        noWrap
                                        title={`${pr.author} · #${pr.number} ·  · +${pr.additions} −${pr.deletions} · ${pr.changedFiles} file${pr.changedFiles === 1 ? "" : "s"}`}
                                        sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        <Link
                                            href={`https://github.com/${pr.author}`}
                                            target="_blank"
                                            color="inherit"
                                            underline="hover"
                                        >
                                            {pr.author}
                                        </Link>{" "}
                                        · #{pr.number} · opened {timeAgo(pr.createdAt)} ·{" "}
                                        ·{" "}
                                        <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>
                                            +{pr.additions}
                                        </Box>{" "}
                                        <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
                                            −{pr.deletions}
                                        </Box>{" "}
                                        · {pr.changedFiles} file{pr.changedFiles === 1 ? "" : "s"}
                                    </Typography>
                                    <Stack
                                        direction="row"
                                        spacing={0.75}
                                        useFlexGap
                                        sx={{
                                            flexWrap: "wrap",
                                            alignItems: "center",
                                            mt: 1.25
                                        }}>
                                        {pr.labels.map((l) => (
                                            <LabelChip key={l.name} label={l} onClick={() => setLabelsOpen(true)} />
                                        ))}
                                        <Chip
                                            size="small"
                                            icon={<LocalOfferRounded sx={{ fontSize: 14 }} />}
                                            label={pr.labels.length ? "Edit labels" : "Add labels"}
                                            variant="outlined"
                                            onClick={() => setLabelsOpen(true)}
                                            sx={{ borderStyle: "dashed", fontWeight: 600 }}
                                        />
                                    </Stack>
                                </Box>
                            </Stack>
                        </Box>

                        {/* Tabs */}
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            sx={{ px: 1, minHeight: 44 }}
                        >
                            <Tab label="Overview" />
                            <Tab label={`Files ${files ? `(${files.length})` : ""}`} />
                            <Tab
                                label={
                                    <Stack direction="row" spacing={0.75} sx={{
                                        alignItems: "center"
                                    }}>
                                        <span>Checks</span>
                                        {checks && <ChecksDot checks={checks} />}
                                    </Stack>
                                }
                            />
                            <Tab label={`Comments ${comments ? `(${comments.length})` : ""}`} />
                        </Tabs>

                        {/* Tab body */}
                        <Box sx={{ flex: 1, overflowY: "auto", px: 1, py: 2 }}>
                            {tab === 0 && <OverviewTab pr={pr} />}
                            {tab === 1 && <FilesTab files={files} />}
                            {tab === 2 && (
                                <ChecksTab prNumber={prNumber} checks={checks} onRefresh={loadChecks} />
                            )}
                            {tab === 3 && (
                                <CommentsTab
                                    prNumber={prNumber}
                                    comments={comments}
                                    onRefresh={loadComments}
                                />
                            )}
                        </Box>

                        {/* Sticky actions */}
                        <ActionBar
                            pr={pr}
                            checks={checks}
                            onApproved={() => onRefreshPr()}
                            onMerged={() => onAdvanced("merged")}
                            onClosed={() => onClosedAdvance()}
                            onSkipped={() => onSkip?.()}
                            onLabelsChanged={() => onRefreshPr()}
                            onRefreshPr={onRefreshPr}
                            notify={notify}
                        />

                        <LabelsDialog
                            open={labelsOpen}
                            onClose={() => setLabelsOpen(false)}
                            prNumber={prNumber}
                            current={pr.labels}
                            onSaved={onLabelsSaved}
                        />
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );

    function onClosedAdvance() {
        onAdvanced("closed");
    }
}

function ChecksDot({ checks }: { checks: ChecksPayload }) {
    const waiting = checks.workflowRuns.some(
        (r) => r.status === "waiting" || r.status === "action_required",
    );
    const failing = checks.checkRuns.some(
        (c) =>
            c.status === "completed" &&
            c.conclusion &&
            !["success", "neutral", "skipped"].includes(c.conclusion),
    );
    const running = checks.checkRuns.some((c) => c.status !== "completed");

    const color = failing
        ? "error.main"
        : waiting || running
          ? "warning.main"
          : "success.main";
    const label = failing
        ? "Checks failing"
        : waiting
          ? "CI needs approval"
          : running
            ? "Checks running"
            : "Checks passing";

    return (
        <Tooltip title={label}>
            <Box
                sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: color,
                    animation: waiting || running ? "pulse 1.6s ease-in-out infinite" : "none",
                    "@keyframes pulse": { "50%": { opacity: 0.35 } },
                }}
            />
        </Tooltip>
    );
}
