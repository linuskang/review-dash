"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Avatar,
    Box,
    Button,
    Card,
    Chip,
    Collapse,
    Divider,
    IconButton,
    Link,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import LocalOfferRounded from "@mui/icons-material/LocalOfferRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { api, timeAgo } from "@/lib/client";
import { parsePrBody } from "@/lib/parse";
import LabelChip from "./label-chip";
import LabelsDialog from "./labels-dialog";
import FilesTab from "./files-tab";
import ChecksTab from "./checks-tab";
import CommentsTab from "./comments-tab";
import ActionBar from "./action-bar";
import Markdown from "./markdown";
import type {
    ChecksPayload,
    PrComment,
    PrDetail,
    PrEvent,
    PrFile,
    PrLabel,
} from "@/lib/types";

type Notify = (message: string, severity?: "success" | "error" | "info") => void;

function StatusPill({
    label,
    ok,
}: {
    label: string;
    ok: boolean | null;
}) {
    const color =
        ok === null
            ? "surfaceContainerHigh"
            : ok
              ? "successContainer"
              : "errorContainer";
    const textColor =
        ok === null
            ? "onSurfaceVariant"
            : ok
              ? "onSuccessContainer"
              : "onErrorContainer";
    const Icon = ok === null ? HelpOutlineRounded : ok ? CheckCircleRounded : CancelRounded;
    return (
        <Chip
            size="small"
            icon={<Icon sx={{ fontSize: 14 }} />}
            label={label}
            sx={{
                bgcolor: color,
                color: textColor,
                fontWeight: 600,
                height: 26,
                borderRadius: "999px",
                "& .MuiChip-icon": { color: textColor },
            }}
        />
    );
}

function assocColor(a: string): string {
    if (["OWNER", "MEMBER", "COLLABORATOR"].includes(a)) return "primaryContainer";
    if (a === "CONTRIBUTOR") return "secondaryContainer";
    if (a === "FIRST_TIMER" || a === "FIRST_TIME_CONTRIBUTOR") return "tertiaryContainer";
    return "surfaceContainerHigh";
}

function assocTextColor(a: string): string {
    if (["OWNER", "MEMBER", "COLLABORATOR"].includes(a)) return "onPrimaryContainer";
    if (a === "CONTRIBUTOR") return "onSecondaryContainer";
    if (a === "FIRST_TIMER" || a === "FIRST_TIME_CONTRIBUTOR") return "onTertiaryContainer";
    return "onSurfaceVariant";
}

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
    const [events, setEvents] = useState<PrEvent[] | null>(null);
    const [checks, setChecks] = useState<ChecksPayload | null>(null);
    const [labelsOpen, setLabelsOpen] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const refreshRef = useRef(onRefreshPr);
    refreshRef.current = onRefreshPr;

    const loadFiles = useCallback(() => {
        api<PrFile[]>(`/api/pr/${prNumber}/files`).then(setFiles).catch(() => setFiles([]));
    }, [prNumber]);

    const loadComments = useCallback(() => {
        api<PrComment[]>(`/api/pr/${prNumber}/comments`).then(setComments).catch(() => setComments([]));
    }, [prNumber]);

    const loadEvents = useCallback(() => {
        api<PrEvent[]>(`/api/pr/${prNumber}/events`).then(setEvents).catch(() => setEvents([]));
    }, [prNumber]);

    const loadChecks = useCallback(() => {
        api<ChecksPayload>(`/api/pr/${prNumber}/checks`).then(setChecks).catch(() => {});
    }, [prNumber]);

    useEffect(() => {
        setFiles(null);
        setComments(null);
        setEvents(null);
        setChecks(null);
        setShowRaw(false);
        loadFiles();
        loadComments();
        loadEvents();
        loadChecks();
    }, [prNumber, loadFiles, loadComments, loadEvents, loadChecks]);

    useEffect(() => {
        if (!checks) return;
        const active =
            checks.checkRuns.some((c) => c.status !== "completed") ||
            checks.workflowRuns.some((r) => r.status !== "completed");
        if (!active) return;
        const id = setInterval(loadChecks, 12_000);
        return () => clearInterval(id);
    }, [checks, loadChecks]);

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

    useEffect(() => {
        if (!pr || pr.mergeable !== null) return;
        const id = setTimeout(() => refreshRef.current(), 2000);
        return () => clearTimeout(id);
    }, [pr]);

    const onLabelsSaved = () => {
        onRefreshPr();
    };

    const parsed = pr ? parsePrBody(pr.body) : null;
    const checkedCount = parsed ? parsed.requirements.filter((r) => r.checked).length : 0;
    const allChecked =
        !!parsed && parsed.requirements.length > 0 && checkedCount === parsed.requirements.length;

    const hasBypass = !!pr?.labels.some((l) => /bypass/i.test(l.name));
    const templateOk = allChecked || hasBypass;

    const previewOk = !!parsed?.previewUrl;
    const jsonReq = parsed?.requirements.find((r) => /json/i.test(r.label));
    const jsonOk = jsonReq ? jsonReq.checked : null;

    const ciFailing = !!checks?.checkRuns.some(
        (c) => c.status === "completed" && c.conclusion && !["success", "neutral", "skipped"].includes(c.conclusion),
    );
    const ciPending = !!checks?.checkRuns.some((c) => c.status !== "completed");
    const ciOk = checks ? !ciFailing && !ciPending && checks.checkRuns.length > 0 : null;

    const validOk = pr ? pr.mergeable !== false && !ciFailing : null;

    const cardSx = { bgcolor: "surfaceContainerLow", borderRadius: "28px", p: 2.5 };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={prNumber}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
            >
                {!pr ? (
                    <Stack spacing={2} sx={{ p: 1 }}>
                        <Skeleton variant="rounded" height={120} sx={{ borderRadius: "28px" }} />
                        <Skeleton variant="rounded" height={320} sx={{ borderRadius: "28px" }} />
                    </Stack>
                ) : (
                    <>
                        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
                            <Stack spacing={2} sx={{ p: 1, pb: 2 }}>
                                {/* Header card */}
                                <Card sx={cardSx}>
                                    <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 1.5 }}>
                                        <Avatar src={pr.avatarUrl} sx={{ width: 56, height: 56 }} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
                                            <Typography variant="h5" noWrap title={pr.author}>
                                                {pr.author}
                                            </Typography>
                                            {pr.authorAssociation && (
                                                <Chip
                                                    size="small"
                                                    label={pr.authorAssociation.replace(/_/g, " ").toLowerCase()}
                                                    sx={{
                                                        height: 20,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        textTransform: "capitalize",
                                                        bgcolor: assocColor(pr.authorAssociation),
                                                        color: assocTextColor(pr.authorAssociation),
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                            title={pr.title}
                                        >
                                            {pr.title}
                                        </Typography>
                                    </Box>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            href={pr.htmlUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            startIcon={<OpenInNewRounded />}
                                            sx={{ borderRadius: "999px", flexShrink: 0 }}
                                        >
                                            Open on GitHub
                                        </Button>
                                    </Stack>

                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        useFlexGap
                                        sx={{ flexWrap: "wrap", alignItems: "center", mb: 2 }}
                                    >
                                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                            #{pr.number}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                            opened {timeAgo(pr.createdAt)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                            {pr.changedFiles} file{pr.changedFiles === 1 ? "" : "s"} changed
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                                            +{pr.additions}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
                                            −{pr.deletions}
                                        </Typography>
                                    </Stack>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        useFlexGap
                                        sx={{ flexWrap: "wrap" }}
                                    >
                                        <StatusPill label="Template check" ok={templateOk} />
                                        <StatusPill label="Website preview" ok={previewOk} />
                                        {jsonReq && <StatusPill label="JSON valid" ok={jsonOk} />}
                                        <StatusPill label="Checks" ok={ciOk} />
                                        <StatusPill label="Valid" ok={validOk} />
                                    </Stack>
                                </Card>

                                {/* Website + purpose card */}
                                <Card sx={cardSx}>
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5 }}>
                                                Website preview
                                            </Typography>
                                            {parsed?.previewUrl ? (
                                                <Link href={parsed.previewUrl} target="_blank" underline="hover" noWrap sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {parsed.previewUrl}
                                                </Link>
                                            ) : (
                                                <Typography variant="body2" sx={{ color: "error.main" }}>
                                                    No preview link found.
                                                </Typography>
                                            )}
                                        </Box>
                                        <Divider />
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5 }}>
                                                Website purpose
                                            </Typography>
                                            {parsed?.purpose ? (
                                                <Markdown>{parsed.purpose}</Markdown>
                                            ) : (
                                                <Typography variant="body2" sx={{ color: "error.main" }}>
                                                    No purpose provided.
                                                </Typography>
                                            )}
                                        </Box>
                                        <Divider />
                                        <Box>
                                            <Stack
                                                direction="row"
                                                onClick={() => setShowRaw((s) => !s)}
                                                sx={{ alignItems: "center", cursor: "pointer", userSelect: "none", py: 0.5, color: "text.secondary", "&:hover": { color: "text.primary" } }}
                                            >
                                                <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700, color: "inherit" }}>
                                                    Full description
                                                </Typography>
                                                <ExpandMoreRounded fontSize="small" sx={{ transform: showRaw ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
                                            </Stack>
                                            <Collapse in={showRaw}>
                                                <Box sx={{ pt: 1 }}>
                                                    <Markdown>{pr.body || "_No description._"}</Markdown>
                                                </Box>
                                            </Collapse>
                                        </Box>
                                    </Stack>
                                </Card>

                                {/* Labels card */}
                                <Card sx={cardSx}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.25 }}>
                                        <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, flex: 1 }}>
                                            Labels
                                        </Typography>
                                        <Button
                                            variant="tonal"
                                            size="small"
                                            startIcon={<LocalOfferRounded />}
                                            onClick={() => setLabelsOpen(true)}
                                            sx={{ minHeight: 32 }}
                                        >
                                            {pr.labels.length ? "Edit labels" : "Add labels"}
                                        </Button>
                                    </Stack>
                                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                                        {pr.labels.length === 0 ? (
                                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                                No labels.
                                            </Typography>
                                        ) : (
                                            pr.labels.map((l) => (
                                                <LabelChip key={l.name} label={l} onClick={() => setLabelsOpen(true)} />
                                            ))
                                        )}
                                    </Stack>
                                </Card>

                                {/* Requirements card */}
                                <Card sx={cardSx}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.25 }}>
                                        <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, flex: 1 }}>
                                            Requirements
                                        </Typography>
                                        {hasBypass && (
                                            <Chip
                                                size="small"
                                                label="Bypassed"
                                                sx={{
                                                    bgcolor: "tertiaryContainer",
                                                    color: "onTertiaryContainer",
                                                    fontWeight: 700,
                                                    height: 22,
                                                }}
                                            />
                                        )}
                                        {parsed && parsed.requirements.length > 0 && (
                                            <Chip
                                                size="small"
                                                label={`${checkedCount}/${parsed.requirements.length}`}
                                                sx={{
                                                    fontWeight: 700,
                                                    height: 22,
                                                    bgcolor: allChecked || hasBypass ? "successContainer" : "errorContainer",
                                                    color: allChecked || hasBypass ? "onSuccessContainer" : "onErrorContainer",
                                                }}
                                            />
                                        )}
                                    </Stack>
                                    {parsed && parsed.requirements.length === 0 ? (
                                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                            No requirement checkboxes found.
                                        </Typography>
                                    ) : (
                                        <Stack spacing={0.25}>
                                            {parsed?.requirements.map((r, i) => (
                                                <Stack
                                                    key={i}
                                                    direction="row"
                                                    spacing={1}
                                                    sx={{
                                                        alignItems: "center",
                                                        px: 1,
                                                        py: 0.5,
                                                        borderRadius: "10px",
                                                        bgcolor: r.checked ? "transparent" : "errorContainer",
                                                    }}
                                                >
                                                    {r.checked ? (
                                                        <CheckCircleRounded sx={{ fontSize: 17, color: "success.main" }} />
                                                    ) : (
                                                        <CancelRounded sx={{ fontSize: 17, color: "onErrorContainer" }} />
                                                    )}
                                                    <Typography variant="body2">{r.label}</Typography>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    )}
                                </Card>

                                {/* Checks */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, px: 0.5 }}>
                                        Checks
                                    </Typography>
                                    <ChecksTab prNumber={prNumber} checks={checks} onRefresh={loadChecks} />
                                </Box>

                                {/* Files */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, px: 0.5 }}>
                                        Files changed
                                    </Typography>
                                    <FilesTab files={files} />
                                </Box>

                                {/* Comments */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, px: 0.5 }}>
                                        Comments
                                    </Typography>
                                    <CommentsTab prNumber={prNumber} comments={comments} events={events} onRefresh={() => { loadComments(); loadEvents(); }} />
                                </Box>
                            </Stack>
                        </Box>

                        <Box sx={{ pt: 1.5 }}>
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
                        </Box>

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