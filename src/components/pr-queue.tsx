"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    Avatar,
    Box,
    Chip,
    IconButton,
    List,
    ListItemButton,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import LabelChip from "./label-chip";
import { timeAgo } from "@/lib/client";
import type { QueuePr } from "@/lib/types";

const MAX_CHIPS = 3;

export default function PrQueue({
    prs,
    selected,
    onSelect,
    loading,
    onRefresh,
}: {
    prs: QueuePr[];
    selected: number | null;
    onSelect: (n: number) => void;
    loading: boolean;
    onRefresh: () => void;
}) {
    return (
        <Box
            component="nav"
            sx={{
                flex: { xs: "0 0 auto", md: "1 1 0" },
                width: { xs: "100%", md: "auto" },
                minWidth: { xs: 0, md: 280 },
                height: { xs: "auto", md: "100%" },
                maxHeight: { xs: 180, md: "none" },
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                bgcolor: "surfaceContainerLow",
                borderRadius: "28px",
                p: 1.5,
                overflow: "hidden",
            }}
        >
            <Stack
                direction="row"
                sx={{
                    alignItems: "center",
                    px: 1.5,
                    pt: 1,
                    pb: 1.5
                }}>
                <Typography variant="h6" sx={{ flex: 1, lineHeight: 1.2 }}>
                    Review Queue{loading ? "" : ` (${prs.length})`}
                </Typography>
                <Tooltip title="Refresh queue">
                    <IconButton onClick={onRefresh} size="small">
                        <RefreshRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            <List
                sx={{
                    overflowY: { xs: "hidden", md: "auto" },
                    overflowX: { xs: "auto", md: "hidden" },
                    flex: 1,
                    display: "flex",
                    flexDirection: { xs: "row", md: "column" },
                    gap: { xs: 1, md: 0 },
                    px: 0.5,
                    py: 0,
                }}
                disablePadding
            >
                {loading &&
                    Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            height={86}
                            sx={{ borderRadius: "24px", mb: 1 }}
                        />
                    ))}

                {!loading && prs.length === 0 && (
                    <Stack
                        sx={{
                            alignItems: "center",
                            py: 8,
                            px: 2,
                        }}>
                        <Typography variant="subtitle1">Queue is clear</Typography>
                    </Stack>
                )}

                <AnimatePresence initial={false}>
                    {prs.map((pr) => {
                        const active = pr.number === selected;
                        return (
                            <motion.div
                                key={pr.number}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                                style={{ width: "100%", minWidth: 260, flexShrink: 0 }}
                            >
                                <ListItemButton
                                    selected={active}
                                    onClick={() => onSelect(pr.number)}
                                    sx={{
                                        alignItems: "flex-start",
                                        borderRadius: "24px",
                                        mb: 0.75,
                                        px: 2,
                                        py: 1.5,
                                        "&.Mui-selected": {
                                            bgcolor: "secondaryContainer",
                                            color: "onSecondaryContainer",
                                            "&:hover": { bgcolor: "secondaryContainer" },
                                        },
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} sx={{ width: "100%", minWidth: 0, alignItems: "stretch" }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 0.25 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
                                                    #{pr.number}{pr.draft ? " · draft" : ""}
                                                </Typography>
                                                {pr.authorAssociation && ["FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR"].includes(pr.authorAssociation) && (
                                                    <Chip
                                                        size="small"
                                                        label="new"
                                                        sx={{ height: 16, fontSize: 10, fontWeight: 700, bgcolor: "tertiaryContainer", color: "onTertiaryContainer" }}
                                                    />
                                                )}
                                            </Stack>
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: 700,
                                                    lineHeight: 1.25,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                    mb: 0.75,
                                                }}
                                            >
                                                {pr.title}
                                            </Typography>
                                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                                                <Avatar src={pr.avatarUrl} sx={{ width: 22, height: 22 }} />
                                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                    {pr.author}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                                    {timeAgo(pr.createdAt)}
                                                </Typography>
                                            </Stack>
                                            {pr.labels.length > 0 && (
                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    useFlexGap
                                                    sx={{ flexWrap: "wrap" }}
                                                >
                                                    {pr.labels.slice(0, MAX_CHIPS).map((l) => (
                                                        <LabelChip key={l.name} label={l} />
                                                    ))}
                                                    {pr.labels.length > MAX_CHIPS && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: "text.secondary", alignSelf: "center" }}
                                                        >
                                                            +{pr.labels.length - MAX_CHIPS}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            )}
                                        </Box>
                                        <Stack sx={{ minWidth: 76, alignItems: "flex-end", justifyContent: "space-between" }}>
                                            {pr.checks && pr.checks.total > 0 && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color:
                                                            pr.checks.failed > 0
                                                                ? "error.main"
                                                                : pr.checks.pending > 0
                                                                  ? "warning.main"
                                                                  : "success.main",
                                                    }}
                                                >
                                                    {pr.checks.passed}/{pr.checks.total} checks
                                                </Typography>
                                            )}
                                            <Box sx={{ flex: 1 }} />
                                            {typeof pr.commentsCount === "number" && pr.commentsCount > 0 && (
                                                <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
                                                    <ChatBubbleOutlineRounded sx={{ fontSize: 13, color: "text.secondary" }} />
                                                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                                        {pr.commentsCount}
                                                    </Typography>
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Stack>
                                </ListItemButton>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </List>
        </Box>
    );
}
