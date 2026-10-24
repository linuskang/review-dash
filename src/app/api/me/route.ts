import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async (_req, { session }) => {
    return NextResponse.json({
        login: session.login,
        name: session.name,
        avatarUrl: session.avatarUrl,
    });
});
