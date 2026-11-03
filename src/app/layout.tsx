import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import ThemeRegistry from "@/components/theme-registry";

const googleSans = Google_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-google-sans",
    adjustFontFallback: false,
});

export const metadata: Metadata = {
    title: "is-a.dev review",
    description: "Fast PR review dashboard for is-a-dev/register maintainers",
    icons: { icon: "/logo-circle.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={googleSans.variable} suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300..800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <ThemeRegistry>{children}</ThemeRegistry>
            </body>
        </html>
    );
}