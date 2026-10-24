"use client";

import { useEffect, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import SendRounded from "@mui/icons-material/SendRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import QuickreplyRounded from "@mui/icons-material/QuickreplyRounded";
import EditNoteRounded from "@mui/icons-material/EditNoteRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import { api, timeAgo } from "@/lib/client";
import { DEFAULT_CANNED, loadCanned, resetCanned, saveCanned } from "@/lib/canned";
import Markdown from "./markdown";
import type { CannedResponse, PrComment } from "@/lib/types";

export default function CommentsTab({
    prNumber,
    comments,
    onRefresh,
}: {
    prNumber: number;
    comments: PrComment[] | null;
    onRefresh: () => void;
}) {
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [canned, setCanned] = useState<CannedResponse[]>(DEFAULT_CANNED);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [manageOpen, setManageOpen] = useState(false);

    useEffect(() => setCanned(loadCanned()), []);

    const send = async () => {
        if (!draft.trim()) return;
        setSending(true);
        try {
            await api(`/api/pr/${prNumber}/comments`, {
                method: "POST",
                body: JSON.stringify({ body: draft }),
            });
            setDraft("");
            onRefresh();
        } finally {
            setSending(false);
        }
    };

    const insertCanned = (c: CannedResponse) => {
        setDraft((d) => (d.trim() ? `${d}\n\n${c.body}` : c.body));
        setMenuAnchor(null);
    };

    return (
        <Stack spacing={2.5}>
            {/* Timeline */}
            <Stack spacing={1.5}>
                {comments === null ? (
                    <Typography sx={{
                        color: "text.secondary"
                   }}>Loading comments…</Typography>
                ) : comments.length === 0 ? (
                    <Typography sx={{
                        color: "text.secondary"
                   }}>No comments yet.</Typography>
                ) : (
                    comments.map((c) => (
                        <Card
                            key={c.id}
                                                        sx={{ bgcolor: "surfaceContainerLow", }}
                        >
                            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    sx={{
                                        alignItems: "center",
                                        mb: 1
                                   }}>
                                    <Avatar src={c.avatarUrl} sx={{ width: 28, height: 28 }} />
                                    <Typography variant="subtitle2">{c.author}</Typography>
                                    {c.isBot && (
                                        <Chip
                                            size="small"
                                            icon={<SmartToyRounded sx={{ fontSize: 14 }} />}
                                            label="bot"
                                            sx={{ height: 20, fontSize: 11 }}
                                        />
                                    )}
                                    {["MEMBER", "COLLABORATOR", "OWNER"].includes(c.association) && (
                                        <Chip
                                            size="small"
                                            label={c.association.toLowerCase()}
                                            sx={{
                                                height: 20,
                                                fontSize: 11,
                                                bgcolor: "primaryContainer",
                                                color: "onPrimaryContainer",
                                           }}
                                        />
                                    )}
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "text.secondary",
                                            ml: "auto"
                                       }}>
                                        {timeAgo(c.createdAt)}
                                    </Typography>
                                </Stack>
                                <Markdown>{c.body}</Markdown>
                            </CardContent>
                        </Card>
                    ))
                )}
            </Stack>

            {/* Composer */}
            <Card sx={{ bgcolor: "surfaceContainer", }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "center",
                            mb: 1.5
                       }}>
                        <Button
                            size="small"
                            variant="tonal"
                            startIcon={<QuickreplyRounded />}
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                        >
                            Canned response
                        </Button>
                        <Tooltip title="Manage canned responses">
                            <IconButton size="small" onClick={() => setManageOpen(true)}>
                                <EditNoteRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Write a reply… (Markdown supported)"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
                       }}
                    />
                    <Stack
                        direction="row"
                        sx={{
                            justifyContent: "flex-end",
                            mt: 1.5
                       }}>
                        <Button
                            variant="contained"
                            endIcon={<SendRounded />}
                            disabled={!draft.trim() || sending}
                            onClick={send}
                        >
                            Comment
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Canned picker menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                slotProps={{ paper: { sx: { maxHeight: 420, width: 340 } } }}
            >
                {canned.map((c) => (
                    <MenuItem key={c.id} onClick={() => insertCanned(c)}>
                        <ListItemText
                            primary={c.title}
                            secondary={c.reasonLabel || undefined}
                            slotProps={{ secondary: { variant: "caption" } }}
                        />
                    </MenuItem>
                ))}
            </Menu>

            {/* Manage dialog */}
            <CannedManager
                open={manageOpen}
                onClose={() => setManageOpen(false)}
                canned={canned}
                onChange={(list) => {
                    setCanned(list);
                    saveCanned(list);
               }}
            />
        </Stack>
    );
}

function CannedManager({
    open,
    onClose,
    canned,
    onChange,
}: {
    open: boolean;
    onClose: () => void;
    canned: CannedResponse[];
    onChange: (list: CannedResponse[]) => void;
}) {
    const [editing, setEditing] = useState<CannedResponse | null>(null);

    const upsert = (item: CannedResponse) => {
        const exists = canned.some((c) => c.id === item.id);
        onChange(exists ? canned.map((c) => (c.id === item.id ? item : c)) : [...canned, item]);
        setEditing(null);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Canned responses</DialogTitle>
            <DialogContent dividers>
                {editing ? (
                    <Stack spacing={2} sx={{ pt: 0.5 }}>
                        <TextField
                            label="Title"
                            value={editing.title}
                            fullWidth
                            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                        />
                        <TextField
                            label="Reason label (optional, e.g. reason: invalid file)"
                            value={editing.reasonLabel || ""}
                            fullWidth
                            onChange={(e) =>
                                setEditing({ ...editing, reasonLabel: e.target.value || undefined })
                            }
                        />
                        <TextField
                            label="Body (Markdown)"
                            value={editing.body}
                            fullWidth
                            multiline
                            minRows={5}
                            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                        />
                        <Stack direction="row" spacing={1} sx={{
                            justifyContent: "flex-end"
                       }}>
                            <Button variant="text" onClick={() => setEditing(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                disabled={!editing.title.trim() || !editing.body.trim()}
                                onClick={() => upsert(editing)}
                            >
                                Save
                            </Button>
                        </Stack>
                    </Stack>
                ) : (
                    <>
                        <List disablePadding>
                            {canned.map((c) => (
                                <ListItem
                                    key={c.id}
                                    sx={{ borderRadius: "16px" }}
                                    secondaryAction={
                                        <Stack direction="row">
                                            <IconButton size="small" onClick={() => setEditing(c)}>
                                                <EditNoteRounded fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => onChange(canned.filter((x) => x.id !== c.id))}
                                            >
                                                <DeleteOutlineRounded fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    }
                                >
                                    <ListItemText
                                        primary={c.title}
                                        secondary={c.reasonLabel || undefined}
                                    />
                                </ListItem>
                            ))}
                        </List>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button
                                variant="tonal"
                                startIcon={<AddRounded />}
                                onClick={() =>
                                    setEditing({
                                        id: `custom-${Date.now()}`,
                                        title: "",
                                        body: "",
                                    })
                                }
                            >
                                New
                            </Button>
                            <Button
                                variant="text"
                                startIcon={<RestartAltRounded />}
                                onClick={() => {
                                    resetCanned();
                                    onChange(DEFAULT_CANNED);
                               }}
                            >
                                Reset to defaults
                            </Button>
                        </Stack>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
}
