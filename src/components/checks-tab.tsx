"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Collapse,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";
import HourglassTopRounded from "@mui/icons-material/HourglassTopRounded";
import PlayCircleFilledWhiteRounded from "@mui/icons-material/PlayCircleFilledWhiteRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import RemoveCircleOutlineRounded from "@mui/icons-material/RemoveCircleOutlineRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import { api } from "@/lib/client";
import type { ChecksPayload } from "@/lib/types";

interface JobLogs {
    name: string;
    htmlUrl: string;
    logs: string;
}

function StatusIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
    if (status === "completed") {
        if (conclusion === "success") return <CheckCircleRounded sx={{ color: "success.main" }} />;
        if (conclusion === "failure" || conclusion === "timed_out" || conclusion === "cancelled")
            return <CancelRounded sx={{ color: "error.main" }} />;
        return <RemoveCircleOutlineRounded sx={{ color: "text.secondary" }} />; // neutral/skipped
    }
    return <HourglassTopRounded sx={{ color: "warning.main" }} />;
}

function LogBlock({ jobs }: { jobs: JobLogs[] }) {
    if (jobs.length === 0) {
        return (
            <Typography variant="body2" sx={{ color: "text.secondary", px: 2, py: 1 }}>
                No failed jobs in this run.
            </Typography>
        );
    }
    return (
        <Stack spacing={1} sx={{ mt: 1 }}>
            {jobs.map((job) => (
                <Box key={job.name}>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 0.5 }}>
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: "onErrorContainer", flex: 1 }}
                        >
                            {job.name}
                        </Typography>
                        <Tooltip title="View job on GitHub">
                            <IconButton size="small" href={job.htmlUrl} target="_blank">
                                <OpenInNewRounded sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Box
                        component="pre"
                        sx={{
                            m: 0,
                            p: 1.5,
                            maxHeight: 300,
                            overflow: "auto",
                            borderRadius: "12px",
                            bgcolor: "surfaceContainerLowest",
                            border: "1px solid",
                                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 11.5,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                       }}
                    >
                        {job.logs}
                    </Box>
                </Box>
            ))}
        </Stack>
    );
}

export default function ChecksTab({
    prNumber,
    checks,
    onRefresh,
}: {
    prNumber: number;
    checks: ChecksPayload | null;
    onRefresh: () => void;
}) {
    const [busy, setBusy] = useState<number | null>(null);
    const [logs, setLogs] = useState<Record<number, JobLogs[] | "loading" | undefined>>({});

    if (!checks) {
        return (
            <Stack sx={{ alignItems: "center", py: 6 }}>
                <CircularProgress size={28} />
            </Stack>
        );
    }

    const act = async (runId: number, action: "approve" | "rerun-failed" | "rerun") => {
        setBusy(runId);
        try {
            await api(`/api/pr/${prNumber}/checks/action`, {
                method: "POST",
                body: JSON.stringify({ runId, action }),
            });
            setTimeout(onRefresh, 1500);
        } finally {
            setBusy(null);
        }
    };

    const toggleLogs = async (runId: number) => {
        if (logs[runId]) {
            setLogs((prev) => ({ ...prev, [runId]: undefined }));
            return;
        }
        setLogs((prev) => ({ ...prev, [runId]: "loading" }));
        try {
            const jobs = await api<JobLogs[]>(`/api/pr/${prNumber}/checks/logs?runId=${runId}`);
            setLogs((prev) => ({ ...prev, [runId]: jobs }));
        } catch {
            setLogs((prev) => ({
                ...prev,
                [runId]: [{ name: "Logs", htmlUrl: "", logs: "Could not load logs." }],
            }));
        }
    };

    const pendingApproval = checks.workflowRuns.filter(
        (r) => r.status === "waiting" || r.status === "action_required",
    );
    const failedRuns = checks.workflowRuns.filter(
        (r) =>
            r.conclusion === "failure" &&
            r.status !== "waiting" &&
            r.status !== "action_required",
    );

    return (
        <Stack spacing={2.5}>
            {/* Runs awaiting maintainer approval */}
            {pendingApproval.length > 0 && (
                <Card sx={{ bgcolor: "tertiaryContainer", }}>
                    <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                        <Typography variant="subtitle1" sx={{ color: "onTertiaryContainer", mb: 0.5 }}>
                            {pendingApproval.length} workflow
                            {pendingApproval.length > 1 ? "s" : ""} waiting for approval
                        </Typography>
                        <Typography variant="body2" sx={{ color: "onTertiaryContainer", opacity: 0.8, mb: 2 }}>
                            GitHub holds CI from first-time contributors until a maintainer approves it.
                        </Typography>
                        <Stack spacing={1}>
                            {pendingApproval.map((run) => (
                                <Stack
                                    key={run.id}
                                    direction="row"
                                    spacing={1.5}
                                    sx={{
                                        alignItems: "center",
                                        bgcolor: "surfaceContainerLow",
                                        borderRadius: "16px",
                                        px: 2,
                                        py: 1.25,
                                   }}
                                >
                                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                                        {run.name}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        disabled={busy === run.id}
                                        startIcon={
                                            busy === run.id ? (
                                                <CircularProgress size={16} color="inherit" />
                                            ) : (
                                                <PlayCircleFilledWhiteRounded />
                                            )
                                        }
                                        onClick={() => act(run.id, "approve")}
                                    >
                                        Approve & run
                                    </Button>
                                    <Tooltip title="View on GitHub">
                                        <IconButton size="small" href={run.htmlUrl} target="_blank">
                                            <OpenInNewRounded fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Check runs */}
            <Card sx={{ bgcolor: "surfaceContainerLow", }}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                        Checks
                    </Typography>
                    {checks.checkRuns.length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            No check runs on the head commit yet.
                        </Typography>
                    ) : (
                        <Stack spacing={0.5}>
                            {checks.checkRuns.map((run) => (
                                <Stack
                                    key={run.id}
                                    direction="row"
                                    spacing={1.5}
                                    sx={{ alignItems: "center", px: 1.25, py: 0.9, borderRadius: "14px" }}
                                >
                                    <StatusIcon status={run.status} conclusion={run.conclusion} />
                                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 550 }}>
                                        {run.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                        {run.status === "completed"
                                            ? run.conclusion
                                            : run.status.replace("_", " ")}
                                    </Typography>
                                    <Tooltip title="View on GitHub">
                                        <IconButton size="small" href={run.htmlUrl} target="_blank">
                                            <OpenInNewRounded fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Failed workflow runs with logs */}
            {failedRuns.length > 0 && (
                <Card sx={{ bgcolor: "surfaceContainerLow", }}>
                    <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                            Failed runs
                        </Typography>
                        <Stack spacing={1}>
                            {failedRuns.map((run) => {
                                const state = logs[run.id];
                                const open = state !== undefined;
                                return (
                                    <Box
                                        key={run.id}
                                        sx={{
                                            bgcolor: "errorContainer",
                                            borderRadius: "16px",
                                            px: 2,
                                            py: 1.25,
                                       }}
                                    >
                                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ flex: 1, fontWeight: 600, color: "onErrorContainer" }}
                                            >
                                                {run.name}
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="tonal"
                                                startIcon={
                                                    state === "loading" ? (
                                                        <CircularProgress size={16} color="inherit" />
                                                    ) : (
                                                        <ArticleRounded />
                                                    )
                                                }
                                                disabled={state === "loading"}
                                                onClick={() => toggleLogs(run.id)}
                                            >
                                                {open && state !== "loading" ? "Hide logs" : "View logs"}
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="tonal"
                                                disabled={busy === run.id}
                                                startIcon={
                                                    busy === run.id ? (
                                                        <CircularProgress size={16} color="inherit" />
                                                    ) : (
                                                        <RestartAltRounded />
                                                    )
                                                }
                                                onClick={() => act(run.id, "rerun-failed")}
                                            >
                                                Rerun
                                            </Button>
                                            <Tooltip title="View on GitHub">
                                                <IconButton size="small" href={run.htmlUrl} target="_blank">
                                                    <OpenInNewRounded fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                        <Collapse in={open && state !== "loading"}>
                                            {state !== "loading" && state ? <LogBlock jobs={state} /> : null}
                                        </Collapse>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="text" size="small" onClick={onRefresh}>
                    Refresh checks
                </Button>
            </Box>
        </Stack>
    );
}
