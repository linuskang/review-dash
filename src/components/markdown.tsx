"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box, Link, Typography } from "@mui/material";

/** Lightweight GitHub-flavored markdown renderer with M3 styling. */
export default function Markdown({ children }: { children: string }) {
    return (
        <Box
            sx={{
                typography: "body2",
                "& a": { color: "primary.main" },
                "& p": { mt: 0, mb: 1.5, "&:last-child": { mb: 0 } },
                "& ul, & ol": { pl: 2.5, my: 0.5 },
                "& li": { mb: 0.25 },
                "& code": {
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: "0.85em",
                    bgcolor: "surfaceContainerHighest",
                    px: 0.6,
                    py: 0.2,
                    borderRadius: 1,
                },
                "& pre": {
                    bgcolor: "surfaceContainerHighest",
                    p: 1.5,
                    borderRadius: 2,
                    overflow: "auto",
                    "& code": { bgcolor: "transparent", p: 0 },
                },
                "& h1, & h2, & h3, & h4": { mt: 2, mb: 0.5, fontWeight: 600 },
                "& h1": { fontSize: "1.3rem" },
                "& h2": { fontSize: "1.15rem" },
                "& h3": { fontSize: "1.05rem" },
                "& blockquote": {
                    m: 0,
                    pl: 1.5,
                    borderLeft: "3px solid",
                    borderColor: "outlineVariant",
                    color: "text.secondary",
                },
                "& input[type=checkbox]": { accentColor: "currentColor", mr: 0.5 },
                "& hr": { border: "none", borderTop: "1px solid", borderColor: "outlineVariant", my: 2 },
                "& img": { maxWidth: "100%", borderRadius: 8 },
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ href, children }) => (
                        <Link href={href} target="_blank" rel="noreferrer">
                            {children}
                        </Link>
                    ),
                    h1: ({ children }) => <Typography variant="h6">{children}</Typography>,
                    h2: ({ children }) => <Typography variant="subtitle1">{children}</Typography>,
                    h3: ({ children }) => <Typography variant="subtitle2">{children}</Typography>,
                }}
            >
                {children}
            </ReactMarkdown>
        </Box>
    );
}
