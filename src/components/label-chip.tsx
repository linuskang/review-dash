"use client";

import { Chip, type ChipProps } from "@mui/material";
import { contrastFor } from "@/lib/client";
import type { PrLabel } from "@/lib/types";

export default function LabelChip({
    label,
    size = "small",
    ...rest
}: { label: PrLabel; size?: ChipProps["size"] } & Omit<ChipProps, "label">) {
    return (
        <Chip
            size={size}
            label={label.name}
            {...rest}
            sx={{
                bgcolor: `#${label.color}`,
                color: contrastFor(label.color),
                fontWeight: 600,
                fontSize: size === "small" ? 11 : 12.5,
                height: size === "small" ? 22 : 28,
                borderRadius: "10px",
                ...rest.sx,
            }}
        />
    );
}
