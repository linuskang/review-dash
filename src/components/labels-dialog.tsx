"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";
import { api } from "@/lib/client";
import type { PrLabel, RepoLabel } from "@/lib/types";

const GROUPS: [string, (name: string) => boolean][] = [
    ["Status", (n) => n.startsWith("status:")],
    ["Reasons", (n) => n.startsWith("reason:")],
    ["CI", (n) => n.startsWith("ci")],
    ["Other", () => true],
];

export default function LabelsDialog({
    open,
    onClose,
    prNumber,
    current,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    prNumber: number;
    current: PrLabel[];
    onSaved: (labels: PrLabel[]) => void;
}) {
    const [all, setAll] = useState<RepoLabel[] | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setSelected(new Set(current.map((l) => l.name)));
            if (!all) {
                api<RepoLabel[]>("/api/labels").then(setAll).catch(() => setAll([]));
            }
        }
    }, [open, current, all]);

    const grouped = useMemo(() => {
        if (!all) return [];
        const used = new Set<string>();
        return GROUPS.map(([title, match]) => {
            const items = all.filter((l) => !used.has(l.name) && match(l.name));
            items.forEach((l) => used.add(l.name));
            return { title, items };
        }).filter((g) => g.items.length > 0);
    }, [all]);

    const toggle = (name: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });

    const save = async () => {
        setSaving(true);
        try {
            const before = new Set(current.map((l) => l.name));
            const add = [...selected].filter((n) => !before.has(n));
            const remove = [...before].filter((n) => !selected.has(n));
            const labels = await api<PrLabel[]>(`/api/pr/${prNumber}/labels`, {
                method: "POST",
                body: JSON.stringify({ add, remove }),
            });
            onSaved(labels);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Edit labels</DialogTitle>
            <DialogContent dividers>
                {!all ? (
                    <Typography sx={{
                        color: "text.secondary"
                    }}>Loading…</Typography>
                ) : (
                    grouped.map((group) => (
                        <Box key={group.title} sx={{ mb: 2.5 }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: "text.secondary",
                                    display: "block",
                                    mb: 1,
                                    fontWeight: 700
                                }}>
                                {group.title}
                            </Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                {group.items.map((l) => {
                                    const active = selected.has(l.name);
                                    return (
                                        <Chip
                                            key={l.name}
                                            label={l.name}
                                            onClick={() => toggle(l.name)}
                                            title={l.description || l.name}
                                            sx={{
                                                fontWeight: 600,
                                                border: "1.5px solid",
                                                borderColor: active ? `#${l.color}` : "outlineVariant",
                                                bgcolor: active ? `#${l.color}26` : "transparent",
                                                color: active ? `#${l.color}` : "text.secondary",
                                                "&:hover": { bgcolor: `#${l.color}33` },
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        </Box>
                    ))
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="text" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={save} disabled={saving || !all}>
                    Save labels
                </Button>
            </DialogActions>
        </Dialog>
    );
}
