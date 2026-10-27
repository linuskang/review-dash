"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Avatar,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Snackbar,
    Alert,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import PrQueue from "./pr-queue";
import ReviewPanel from "./review-panel";
import PreviewColumn from "./preview-column";
import Wordmark from "./wordmark";
import { useColorMode } from "./theme-registry";
import { api } from "@/lib/client";
import type { PrDetail, QueuePr } from "@/lib/types";

interface Me {
    login: string;
    name: string | null;
    avatarUrl: string;
}

export default function Dashboard() {
    const { mode, toggle } = useColorMode();
    const [me, setMe] = useState<Me | null>(null);
    const [prs, setPrs] = useState<QueuePr[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [prDetail, setPrDetail] = useState<PrDetail | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [toast, setToast] = useState<{ message: string; severity: "success" | "error" | "info" } | null>(
        null,
    );

    const notify = useCallback(
        (message: string, severity: "success" | "error" | "info" = "success") =>
            setToast({ message, severity }),
        [],
    );

    const updateQueuePr = useCallback((n: number, patch: Partial<QueuePr>) => {
        setPrs((queue) => queue.map((p) => (p.number === n ? { ...p, ...patch } : p)));
    }, []);

    const loadQueue = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const list = await api<QueuePr[]>("/api/prs");
            setPrs(list);
            setSelected((sel) => {
                if (sel && list.some((p) => p.number === sel)) return sel;
                return list.length ? list[0].number : null; // oldest open PR
            });
        } catch (e) {
            notify(e instanceof Error ? e.message : "Failed to load queue", "error");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [notify]);

    const loadPrDetail = useCallback(
        async (n: number) => {
            try {
                const detail = await api<PrDetail>(`/api/pr/${n}`);
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
                setPrDetail(null);
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

    useEffect(() => {
        if (selected) loadPrDetail(selected);
        else setPrDetail(null);
    }, [selected, loadPrDetail]);

    useEffect(() => {
        api<Me>("/api/me").then(setMe).catch(() => {});
        loadQueue();
    }, [loadQueue]);

    /** After merging/closing: drop it from the queue and jump to the next newest PR. */
    const handleAdvanced = useCallback(
        (action: "merged" | "closed") => {
            setPrs((queue) => {
                const idx = queue.findIndex((p) => p.number === selected);
                const next = queue.filter((p) => p.number !== selected);
                const target = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
                setSelected(target ? target.number : null);
                return next;
            });
            if (action === "closed") notify("Moving to next PR", "info");
        },
        [selected, notify],
    );

    const handleSkip = useCallback(() => {
        setPrs((queue) => {
            const idx = queue.findIndex((p) => p.number === selected);
            if (queue.length <= 1) return queue;
            const next = queue[(idx + 1) % queue.length];
            setSelected(next.number);
            return queue;
        });
    }, [selected]);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", p: 1, gap: 1 }}>
            {/* Top bar */}
            <Stack
                direction="row"
                spacing={1.5}
                sx={{
                    alignItems: "center",
                    px: 1
                }}>
                <Wordmark height={34} />
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
                            <MenuItem component="a" href="/api/auth/logout">
                                <LogoutRounded fontSize="small" style={{ marginRight: 10 }} />
                                Sign out
                            </MenuItem>
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
                    onRefresh={() => loadQueue()}
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
                            prNumber={selected}
                            pr={prDetail}
                            onRefreshPr={() => selected && loadPrDetail(selected)}
                            onSyncQueue={(patch) => selected && handleQueuePatch(selected, patch)}
                            onAdvanced={handleAdvanced}
                            onSkip={handleSkip}
                            notify={notify}
                        />
                    )}
                </Box>
                {selected !== null && (
                    <Box sx={{ display: { xs: "none", md: "flex" }, flex: "2.5 1 0", minWidth: 0 }}>
                        <PreviewColumn pr={prDetail} />
                    </Box>
                )}
            </Stack>

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
