"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import {
    createTheme,
    ThemeProvider,
    type PaletteMode,
    type Theme,
} from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation";

// ---------------------------------------------------------------------------
// Material Design 3 (Expressive) color schemes — baseline purple seed #6750A4.
// ---------------------------------------------------------------------------

declare module "@mui/material/styles" {
    interface Palette {
        primaryContainer: string;
        onPrimaryContainer: string;
        secondaryContainer: string;
        onSecondaryContainer: string;
        tertiaryContainer: string;
        onTertiaryContainer: string;
        errorContainer: string;
        onErrorContainer: string;
        successContainer: string;
        onSuccessContainer: string;
        surfaceContainerLowest: string;
        surfaceContainerLow: string;
        surfaceContainer: string;
        surfaceContainerHigh: string;
        surfaceContainerHighest: string;
        onSurfaceVariant: string;
        outlineVariant: string;
    }
    interface PaletteOptions {
        primaryContainer?: string;
        onPrimaryContainer?: string;
        secondaryContainer?: string;
        onSecondaryContainer?: string;
        tertiaryContainer?: string;
        onTertiaryContainer?: string;
        errorContainer?: string;
        onErrorContainer?: string;
        successContainer?: string;
        onSuccessContainer?: string;
        surfaceContainerLowest?: string;
        surfaceContainerLow?: string;
        surfaceContainer?: string;
        surfaceContainerHigh?: string;
        surfaceContainerHighest?: string;
        onSurfaceVariant?: string;
        outlineVariant?: string;
    }
}

declare module "@mui/material/Button" {
    interface ButtonPropsVariantOverrides {
        tonal: true;
    }
}

const md3 = {
    light: {
        primary: "#6750A4",
        onPrimary: "#FFFFFF",
        primaryContainer: "#EADDFF",
        onPrimaryContainer: "#21005D",
        secondary: "#625B71",
        onSecondary: "#FFFFFF",
        secondaryContainer: "#E8DEF8",
        onSecondaryContainer: "#1D192B",
        tertiary: "#7D5260",
        tertiaryContainer: "#FFD8E4",
        onTertiaryContainer: "#31111D",
        error: "#B3261E",
        onError: "#FFFFFF",
        errorContainer: "#F9DEDC",
        onErrorContainer: "#410E0B",
        success: "#146C2E",
        successContainer: "#A6F2A5",
        onSuccessContainer: "#002204",
        surface: "#FEF7FF",
        onSurface: "#1D1B20",
        onSurfaceVariant: "#49454F",
        surfaceContainerLowest: "#FFFFFF",
        surfaceContainerLow: "#F7F2FA",
        surfaceContainer: "#F3EDF7",
        surfaceContainerHigh: "#ECE6F0",
        surfaceContainerHighest: "#E6E0E9",
        outline: "#79747E",
        outlineVariant: "#CAC4D0",
    },
    dark: {
        primary: "#D0BCFF",
        onPrimary: "#381E72",
        primaryContainer: "#4F378B",
        onPrimaryContainer: "#EADDFF",
        secondary: "#CCC2DC",
        onSecondary: "#332D41",
        secondaryContainer: "#4A4458",
        onSecondaryContainer: "#E8DEF8",
        tertiary: "#EFB8C8",
        tertiaryContainer: "#633B48",
        onTertiaryContainer: "#FFD8E4",
        error: "#F2B8B5",
        onError: "#601410",
        errorContainer: "#8C1D18",
        onErrorContainer: "#F9DEDC",
        success: "#8EDB8F",
        successContainer: "#005313",
        onSuccessContainer: "#A6F2A5",
        surface: "#141218",
        onSurface: "#E6E0E9",
        onSurfaceVariant: "#CAC4D0",
        surfaceContainerLowest: "#0F0D13",
        surfaceContainerLow: "#1D1B20",
        surfaceContainer: "#211F26",
        surfaceContainerHigh: "#2B2930",
        surfaceContainerHighest: "#36343B",
        outline: "#938F99",
        outlineVariant: "#49454F",
    },
} as const;

const EMPHASIZED = "cubic-bezier(0.2, 0, 0, 1)";
const EMPHASIZED_ACCEL = "cubic-bezier(0.3, 0, 0.8, 0.15)";

function buildTheme(mode: PaletteMode): Theme {
    const c = md3[mode];
    return createTheme({
        palette: {
            mode,
            primary: { main: c.primary, contrastText: c.onPrimary },
            secondary: { main: c.secondary, contrastText: c.onSecondary },
            error: { main: c.error, contrastText: c.onError },
            success: { main: c.success },
            background: { default: c.surface, paper: c.surfaceContainerLow },
            text: { primary: c.onSurface, secondary: c.onSurfaceVariant },
            divider: c.outlineVariant,
            primaryContainer: c.primaryContainer,
            onPrimaryContainer: c.onPrimaryContainer,
            secondaryContainer: c.secondaryContainer,
            onSecondaryContainer: c.onSecondaryContainer,
            tertiaryContainer: c.tertiaryContainer,
            onTertiaryContainer: c.onTertiaryContainer,
            errorContainer: c.errorContainer,
            onErrorContainer: c.onErrorContainer,
            successContainer: c.successContainer,
            onSuccessContainer: c.onSuccessContainer,
            surfaceContainerLowest: c.surfaceContainerLowest,
            surfaceContainerLow: c.surfaceContainerLow,
            surfaceContainer: c.surfaceContainer,
            surfaceContainerHigh: c.surfaceContainerHigh,
            surfaceContainerHighest: c.surfaceContainerHighest,
            onSurfaceVariant: c.onSurfaceVariant,
            outlineVariant: c.outlineVariant,
        },
        shape: { borderRadius: 16 },
        typography: {
            fontFamily: `"Roboto Flex", "Google Sans", "Segoe UI", system-ui, sans-serif`,
            h4: { fontWeight: 550, letterSpacing: -0.25 },
            h5: { fontWeight: 550, letterSpacing: -0.15 },
            h6: { fontWeight: 600, letterSpacing: -0.1 },
            subtitle1: { fontWeight: 550 },
            subtitle2: { fontWeight: 600 },
            button: { fontWeight: 600, letterSpacing: 0.1 },
        },
        transitions: {
            easing: {
                easeInOut: EMPHASIZED,
                easeOut: EMPHASIZED_ACCEL,
                sharp: EMPHASIZED_ACCEL,
            },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    "::selection": { background: c.primaryContainer, color: c.onPrimaryContainer },
                },
            },
            MuiButton: {
                defaultProps: { disableElevation: true },
                variants: [
                    {
                        props: { variant: "tonal" },
                        style: {
                            backgroundColor: c.secondaryContainer,
                            color: c.onSecondaryContainer,
                            "&:hover": { backgroundColor: c.surfaceContainerHighest },
                        },
                    },
                ],
                styleOverrides: {
                    root: {
                        borderRadius: 999,
                        textTransform: "none",
                        paddingInline: 22,
                        transition: `all 200ms ${EMPHASIZED}`,
                        "&:active": { transform: "scale(0.97)", borderRadius: 12 },
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: { transition: `all 180ms ${EMPHASIZED}`, "&:active": { transform: "scale(0.92)" } },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 10, fontWeight: 550 },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: { borderRadius: 28, backgroundImage: "none" },
                },
            },
            MuiPaper: {
                styleOverrides: { root: { backgroundImage: "none" } },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: { borderRadius: 28, backgroundImage: "none", backgroundColor: c.surfaceContainerHigh },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: { borderRadius: 20, backgroundColor: c.surfaceContainer },
                    list: { padding: 8 },
                },
            },
            MuiMenuItem: {
                styleOverrides: { root: { borderRadius: 12 } },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 999,
                        transition: `background-color 200ms ${EMPHASIZED}`,
                    },
                },
            },
            MuiTabs: {
                styleOverrides: {
                    indicator: { height: 3, borderRadius: "3px 3px 0 0" },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: { textTransform: "none", fontWeight: 600, minHeight: 44 },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: { borderRadius: 16 },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: { borderRadius: 8, backgroundColor: c.onSurface, color: c.surface },
                },
            },
            MuiAlert: {
                styleOverrides: { root: { borderRadius: 16 } },
            },
            MuiSnackbarContent: {
                styleOverrides: { root: { borderRadius: 12 } },
            },
            MuiFab: {
                styleOverrides: { root: { borderRadius: 20 } },
            },
        },
    });
}

const ModeContext = createContext<{ mode: PaletteMode; toggle: () => void }>({
    mode: "dark",
    toggle: () => {},
});

export const useColorMode = () => useContext(ModeContext);

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<PaletteMode>("dark");

    useEffect(() => {
        const stored = window.localStorage.getItem("isd_mode");
        if (stored === "light" || stored === "dark") setMode(stored);
    }, []);

    const value = useMemo(
        () => ({
            mode,
            toggle: () =>
                setMode((m) => {
                    const next = m === "dark" ? "light" : "dark";
                    window.localStorage.setItem("isd_mode", next);
                    return next;
                }),
        }),
        [mode],
    );

    const theme = useMemo(() => buildTheme(mode), [mode]);

    return (
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <ModeContext.Provider value={value}>
                <ThemeProvider theme={theme}>
                    <CssBaseline enableColorScheme />
                    {children}
                </ThemeProvider>
            </ModeContext.Provider>
        </AppRouterCacheProvider>
    );
}
