"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
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

let cachedRepoLabels: RepoLabel[] | null = null;

export function LabelsPicker({
    open,
    selected,
    onToggle,
    autoFocus = false,
    onLoadedChange,
}: {
    open: boolean;
    selected: Set<string>;
    onToggle: (name: string) => void;
    autoFocus?: boolean;
    onLoadedChange?: (loaded: boolean) => void;
}) {
    const [all, setAll] = useState<RepoLabel[] | null>(cachedRepoLabels);
    const [query, setQuery] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        onLoadedChange?.(Boolean(all));
    }, [all, onLoadedChange]);

    useEffect(() => {
        if (open) {
            setQuery("");
            if (!all) {
                api<RepoLabel[]>("/api/labels")
                    .then((list) => {
                        cachedRepoLabels = list;
                        setAll(list);
                    })
                    .catch(() => setAll([]));
            }
            if (autoFocus) {
                setTimeout(() => searchRef.current?.focus(), 100);
            }
        }
    }, [open, all, autoFocus]);

    const grouped = useMemo(() => {
        if (!all) return [];
        const q = query.trim().toLowerCase();
        const used = new Set<string>();
        return GROUPS.map(([title, match]) => {
            const items = all.filter(
                (l) => !used.has(l.name) && match(l.name) && (q === "" || l.name.toLowerCase().includes(q)),
            );
            items.forEach((l) => used.add(l.name));
            return { title, items };
        }).filter((g) => g.items.length > 0);
    }, [all, query]);

    const handleChipClick = (name: string) => {
        onToggle(name);
        setQuery("");
        searchRef.current?.focus();
    };

    return (
        <Box>
            <TextField
                inputRef={searchRef}
                autoFocus={autoFocus}
                fullWidth
                size="small"
                placeholder="Search labels…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 2 }}
            />
            {!all ? (
                <Typography sx={{ color: "text.secondary" }}>Loading…</Typography>
            ) : grouped.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No matching labels.
                </Typography>
            ) : (
                grouped.map((group) => (
                    <Box key={group.title} sx={{ mb: 2.5, "&:last-child": { mb: 0 } }}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                color: "text.secondary",
                                display: "block",
                                mb: 1,
                                fontWeight: 700,
                            }}
                        >
                            {group.title}
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {group.items.map((l) => {
                                const active = selected.has(l.name);
                                return (
                                    <Chip
                                        key={l.name}
                                        label={l.name}
                                        onClick={() => handleChipClick(l.name)}
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
        </Box>
    );
}

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
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (open) {
            setSelected(new Set(current.map((l) => l.name)));
        }
    }, [open, current]);

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
                <LabelsPicker
                    open={open}
                    selected={selected}
                    onToggle={toggle}
                    autoFocus
                    onLoadedChange={setLoaded}
                />
            </DialogContent>
            <DialogActions>
                <Button variant="text" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={save} disabled={saving || !loaded}>
                    Save labels
                </Button>
            </DialogActions>
        </Dialog>
    );
}
