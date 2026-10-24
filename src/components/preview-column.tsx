"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Box,
    Card,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import { parsePrBody } from "@/lib/parse";
import type { PrDetail } from "@/lib/types";

const STORAGE_KEY = "isd_preview_open";

export default function PreviewColumn({ pr }: { pr: PrDetail | null }) {
    const [open, setOpen] = useState(true);
    const [showPreview, setShowPreview] = useState(true);
    const [previewKey, setPreviewKey] = useState(0);

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "0") setOpen(false);
    }, []);

    const toggleOpen = () => {
        setOpen((o) => {
            const next = !o;
            window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
            return next;
        });
    };

    const previewUrl = pr ? parsePrBody(pr.body).previewUrl : null;

    if (!open) {
        return (
            <Box
                sx={{
                    width: 44,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "surfaceContainerLow",
                    borderRadius: "28px",
                }}
            >
                <Tooltip title="Show website preview" placement="left">
                    <IconButton onClick={toggleOpen} size="small">
                        <ChevronLeftRounded />
                    </IconButton>
                </Tooltip>
            </Box>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column" }}
        >
            <Card
                                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "surfaceContainerLow",
                                        borderRadius: "28px",
                    overflow: "hidden",
                }}
            >
                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", px: 2, pt: 1.5, pb: 0.5 }}
                >
                    <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        Website preview
                    </Typography>
                    {previewUrl && (
                        <>
                            <Tooltip title={showPreview ? "Hide" : "Show"}>
                                <IconButton size="small" onClick={() => setShowPreview((s) => !s)}>
                                    {showPreview ? (
                                        <VisibilityOffRounded fontSize="small" />
                                    ) : (
                                        <VisibilityRounded fontSize="small" />
                                    )}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Reload">
                                <IconButton size="small" onClick={() => setPreviewKey((k) => k + 1)}>
                                    <RefreshRounded fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Open site">
                                <IconButton size="small" href={previewUrl} target="_blank" rel="noreferrer">
                                    <OpenInNewRounded fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="Hide preview column">
                        <IconButton size="small" onClick={toggleOpen}>
                            <ChevronRightRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Box sx={{ flex: 1, minHeight: 0, px: 1.5, pb: 1.5, display: "flex", flexDirection: "column" }}>
                    {!pr ? (
                        <Box sx={{ flex: 1, borderRadius: "20px", bgcolor: "surfaceContainer" }} />
                    ) : !previewUrl ? (
                        <Stack
                            sx={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                px: 2,
                            }}
                        >
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                No preview link in the PR description.
                            </Typography>
                        </Stack>
                    ) : (
                        <>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "text.secondary",
                                    mb: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {previewUrl}
                            </Typography>
                            {showPreview && (
                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        borderRadius: "20px",
                                        overflow: "hidden",
                                        border: "1px solid",
                                                                                bgcolor: "#fff",
                                    }}
                                >
                                    <Box
                                        key={previewKey}
                                        component="iframe"
                                        src={previewUrl}
                                        title="Website preview"
                                        sandbox="allow-scripts allow-same-origin"
                                        sx={{ width: "100%", height: "100%", border: 0 }}
                                    />
                                </Box>
                            )}
                            {!showPreview && (
                                <Stack
                                    sx={{
                                        flex: 1,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                        Preview hidden.
                                    </Typography>
                                </Stack>
                            )}
                        </>
                    )}
                </Box>
            </Card>
        </motion.div>
    );
}
