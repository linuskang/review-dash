"use client";

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Chip,
    Stack,
    Typography,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import type { PrFile } from "@/lib/types";

const STATUS_COLOR: Record<string, "success" | "info" | "error" | "warning"> = {
    added: "success",
    modified: "info",
    removed: "error",
    renamed: "warning",
};

function PatchLine({ line }: { line: string }) {
    let sx = {};
    if (line.startsWith("+")) {
        sx = { bgcolor: "rgba(46, 160, 67, 0.18)", color: "success.main" };
    } else if (line.startsWith("-")) {
        sx = { bgcolor: "rgba(248, 81, 73, 0.15)", color: "error.main" };
    } else if (line.startsWith("@@")) {
        sx = { color: "primary.main", bgcolor: "surfaceContainerHigh" };
    }
    return (
        <Box
            component="div"
            sx={{
                px: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12,
                lineHeight: 1.55,
                ...sx,
            }}
        >
            {line}
        </Box>
    );
}

export default function FilesTab({ files }: { files: PrFile[] | null }) {
    if (!files) {
        return (
            <Typography sx={{
                color: "text.secondary"
            }}>Loading files…</Typography>
        );
    }
    if (files.length === 0) {
        return (
            <Typography sx={{
                color: "text.secondary"
            }}>No changed files.</Typography>
        );
    }
    return (
        <Stack spacing={1.5}>
            {files.map((f) => (
                <Accordion
                    key={f.filename}
                    defaultExpanded={files.length <= 5}
                    disableGutters
                    sx={{
                        borderRadius: "20px !important",
                                                bgcolor: "surfaceContainerLow",
                        "&:before": { display: "none" },
                        overflow: "hidden",
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                                alignItems: "center",
                                width: "100%",
                                minWidth: 0
                            }}>
                            <Chip
                                size="small"
                                label={f.status}
                                color={STATUS_COLOR[f.status] || "info"}
                                                                sx={{ textTransform: "capitalize" }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    fontWeight: 600,
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {f.filename}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                                +{f.additions}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
                                −{f.deletions}
                            </Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        {f.patch ? (
                            <Box sx={{ py: 1, overflowX: "auto" }}>
                                {f.patch.split("\n").map((line, i) => (
                                    <PatchLine key={i} line={line} />
                                ))}
                            </Box>
                        ) : (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "text.secondary",
                                    p: 2
                                }}>
                                Diff too large to display.{" "}
                                <a href={f.rawUrl} target="_blank" rel="noreferrer">
                                    view raw file
                                </a>
                                .
                            </Typography>
                        )}
                    </AccordionDetails>
                </Accordion>
            ))}
        </Stack>
    );
}
