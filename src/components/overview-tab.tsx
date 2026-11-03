"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Box,
    Card,
    Chip,
    Collapse,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { parsePrBody } from "@/lib/parse";
import Markdown from "./markdown";
import type { PrDetail } from "@/lib/types";

const spring = { type: "spring", stiffness: 320, damping: 30 } as const;

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: "text.secondary", flex: 1, fontWeight: 700 }}>
                {children}
            </Typography>
            {right}
        </Stack>
    );
}

export default function OverviewTab({ pr }: { pr: PrDetail }) {
    const parsed = useMemo(() => parsePrBody(pr.body), [pr.body]);
    const [showRaw, setShowRaw] = useState(false);

    const checkedCount = parsed.requirements.filter((r) => r.checked).length;
    const allChecked =
        parsed.requirements.length > 0 && checkedCount === parsed.requirements.length;

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <Card
                                sx={{ bgcolor: "surfaceContainerLow",  }}
            >
                <Box sx={{ p: 2.5 }}>
                    {/* Requirements */}
                    <SectionLabel
                        right={
                            parsed.requirements.length > 0 ? (
                                <Chip
                                    size="small"
                                    label={`${checkedCount}/${parsed.requirements.length}`}
                                    sx={{
                                        fontWeight: 700,
                                        height: 22,
                                        bgcolor: allChecked ? "successContainer" : "errorContainer",
                                        color: allChecked ? "onSuccessContainer" : "onErrorContainer",
                                    }}
                                />
                            ) : undefined
                        }
                    >
                        Requirements
                    </SectionLabel>
                    {parsed.requirements.length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            No requirement checkboxes found. This may not be a domain PR.
                        </Typography>
                    ) : (
                        <Stack spacing={0.25}>
                            {parsed.requirements.map((r, i) => (
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
                                        <CheckCircleRounded
                                            sx={{ fontSize: 17, color: "success.main" }}
                                        />
                                    ) : (
                                        <RadioButtonUncheckedRounded
                                            sx={{ fontSize: 17, color: "onErrorContainer" }}
                                        />
                                    )}
                                    <Typography variant="body2">{r.label}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </Box>

                <Divider sx={{  }} />

                {/* Website preview URL */}
                <Box sx={{ p: 2.5 }}>
                    <SectionLabel
                        right={
                            parsed.previewUrl ? (
                                <Tooltip title="Open site">
                                    <IconButton
                                        size="small"
                                        href={parsed.previewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <OpenInNewRounded fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : undefined
                        }
                    >
                        Website preview
                    </SectionLabel>
                    {parsed.previewUrl ? (
                        <Typography
                            variant="body2"
                            noWrap
                            title={parsed.previewUrl}
                            sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                            {parsed.previewUrl}
                        </Typography>
                    ) : (
                        <Typography variant="body2" sx={{ color: "error.main" }}>
                            No preview link found in the description.
                        </Typography>
                    )}
                </Box>

                <Divider sx={{  }} />

                {/* Purpose */}
                <Box sx={{ p: 2.5 }}>
                    <SectionLabel>Website purpose</SectionLabel>
                    {parsed.purpose ? (
                        <Markdown>{parsed.purpose}</Markdown>
                    ) : (
                        <Typography variant="body2" sx={{ color: "error.main" }}>
                            No purpose provided.
                        </Typography>
                    )}
                </Box>

                <Divider sx={{  }} />

                {/* Raw description */}
                <Box sx={{ px: 2.5, py: 1 }}>
                    <Stack
                        direction="row"
                        onClick={() => setShowRaw((s) => !s)}
                        sx={{
                            alignItems: "center",
                            cursor: "pointer",
                            userSelect: "none",
                            py: 0.75,
                            color: "text.secondary",
                            "&:hover": { color: "text.primary" },
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700, color: "inherit" }}>
                            Full description
                        </Typography>
                        <ExpandMoreRounded
                            fontSize="small"
                            sx={{
                                transform: showRaw ? "rotate(180deg)" : "none",
                                transition: "transform 200ms",
                            }}
                        />
                    </Stack>
                    <Collapse in={showRaw}>
                        <Box sx={{ pb: 1.5 }}>
                            <Markdown>{pr.body || "_No description._"}</Markdown>
                        </Box>
                    </Collapse>
                </Box>
            </Card>
        </motion.div>
    );
}
