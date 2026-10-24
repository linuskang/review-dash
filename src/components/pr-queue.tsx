"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    Avatar,
    Box,
    IconButton,
    List,
    ListItemButton,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
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
                width: 340,
                flexShrink: 0,
                height: "100%",
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

            <List sx={{ overflowY: "auto", flex: 1, px: 0.5, py: 0 }} disablePadding>
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
                                    <Stack direction="row" spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
                                        <Avatar src={pr.avatarUrl} sx={{ width: 34, height: 34, mt: 0.25 }} />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    lineHeight: 1.3,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                {pr.title}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: "text.secondary"
                                            }}>
                                                #{pr.number} · {pr.author} · {timeAgo(pr.createdAt)}
                                                {pr.draft ? " · draft" : ""}
                                            </Typography>
                                            {pr.labels.length > 0 && (
                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    useFlexGap
                                                    sx={{
                                                        flexWrap: "wrap",
                                                        mt: 0.75
                                                    }}>
                                                    {pr.labels.slice(0, MAX_CHIPS).map((l) => (
                                                        <LabelChip key={l.name} label={l} />
                                                    ))}
                                                    {pr.labels.length > MAX_CHIPS && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: "text.secondary",
                                                                alignSelf: "center"
                                                            }}>
                                                            +{pr.labels.length - MAX_CHIPS}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            )}
                                        </Box>
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
