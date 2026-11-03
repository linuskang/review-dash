"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import TerminalRounded from "@mui/icons-material/TerminalRounded";

const ERRORS: Record<string, string> = {
    state: "Sign-in session expired. Try again.",
    token: "Couldn't complete GitHub sign-in. Try again.",
    user: "Couldn't read your GitHub profile. Try again.",
    permission:
        "Your GitHub account doesn't have write access to the repository. This dashboard is for maintainers.",
    "dev-token": "The configured dev token is invalid.",
    expired: "Your GitHub session expired. Please sign in again.",
};

export default function LoginClient() {
    const params = useSearchParams();
    const error = params.get("error");
    const user = params.get("user");
    const [devAvailable, setDevAvailable] = useState(false);

    useEffect(() => {
        fetch("/api/auth/dev?probe")
            .then((r) => setDevAvailable(r.ok))
            .catch(() => {});
    }, []);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                bgcolor: "surface",
                backgroundImage:
                    "radial-gradient(60rem 40rem at 80% -10%, rgba(103,80,164,0.25), transparent), radial-gradient(50rem 36rem at -10% 110%, rgba(125,82,96,0.2), transparent)",
                p: 2,
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
                <Stack
                    spacing={3}
                    sx={{
                        alignItems: "center",
                        bgcolor: "surfaceContainerLow",
                        borderRadius: "32px",
                        p: { xs: 4, sm: 6 },
                        maxWidth: 460,
                        textAlign: "center"
                    }}>
                    <Box
                        component="img"
                        src="/logo-circle.png"
                        alt="is-a.dev"
                        sx={{ width: 88, height: 88, borderRadius: "50%" }}
                    />
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            is-a.dev review dash
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ borderRadius: "16px", textAlign: "left" }}>
                            {Object.hasOwn(ERRORS, error) ? ERRORS[error] : "Sign-in failed."}
                            {error === "permission" && user ? ` (signed in as ${user})` : ""}
                        </Alert>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<GitHubIcon />}
                        href="/api/auth/login"
                        sx={{ px: 4, py: 1.4, fontSize: 16 }}
                    >
                        Sign in with GitHub
                    </Button>
                    {devAvailable && (
                        <Button
                            variant="tonal"
                            size="small"
                            startIcon={<TerminalRounded />}
                            href="/api/auth/dev"
                        >
                            Local sign in
                        </Button>
                    )}
                </Stack>
            </motion.div>
        </Box>
    );
}
